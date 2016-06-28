var Server = require('karma').Server
var data = JSON.parse(process.argv[2])
var server = new Server(data)

server.start(data)
