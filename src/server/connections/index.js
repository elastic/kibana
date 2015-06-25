module.exports = function (kibana) {
  var server = kibana.server;
  var config = server.config();

  // Create a new connection
  server.connection({
    host: config.get('kibana.server.host'),
    port: config.get('kibana.server.port')
  });

  server.decorate('server', 'exposeStaticDir', function (routePath, dirPath) {
    this.route({
      path: routePath,
      method: 'GET',
      handler: {
        directory: {
          path: dirPath,
          listing: true,
          redirectToSlash: true,
          lookupCompressed: true
        }
      }
    });
  });

  server.ext('onPreResponse', function (request, reply) {
    var response = request.response;
    response.header('X-App-Name', 'kibana');
    return reply.continue();
  });

};
