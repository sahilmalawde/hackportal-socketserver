import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import { Server } from 'socket.io';
import { createServer } from 'node:http';

const app = express()
const server = createServer(app);
const port = 3001
app.use(bodyparser.json())
app.use(cors())

const io =new Server(server,{
    cors:{
        origin: "http://localhost:5173/",
        methods: ["GET","POST"]
    }
})

const userMap = {};

const getAllConnectedClients = (roomId) =>{

    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) =>{
        return {
            socketId,
            username : userMap[socketId]
        }
    })
}

io.on("connection",(socket)=>{

    socket.on('join',({roomId, username})=>{
        userMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId}) =>{
            io.to(socketId).emit("joined",{
                clients,
                username,
                socketId : socket.id,
            })
        })

        
    })

    socket.on("sync",({code,roomId})=>{

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId}) =>{
            
            
            io.to(socketId).emit("sync",{code,roomId})
        })
    })

    
    socket.on('disconnect', () => {
        const rooms = Object.keys(socket.rooms);
        rooms.forEach((roomId) => {
          if (userMap[socket.id]) {
            delete userMap[socket.id];
            const clients = getAllConnectedClients(roomId);
            clients.forEach(({ socketId }) => {
              io.to(socketId).emit("disconnect", userMap[socketId]);
            });
          }
        });
        console.log('Client disconnected:', socket.id);
      });
})

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})