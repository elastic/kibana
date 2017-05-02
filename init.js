module.exports = function (server, /*options*/) {
  server.plugins.canvas = {
    kibanaType: 'canvas_1'
  };

  // Load routes here
  //require('./server/routes/get.js')(server);
};
