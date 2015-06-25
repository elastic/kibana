module.exports = function (kibana) {
  var server = kibana.server;
  var config = server.config();

  // Create a new connection
  server.connection({
    host: config.get('kibana.server.host'),
    port: config.get('kibana.server.port')
  });

};
