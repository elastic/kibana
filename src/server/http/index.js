module.exports = function (kibana, server, config) {

  // Create a new connection
  server.connection({
    host: config.get('kibana.server.host'),
    port: config.get('kibana.server.port')
  });

  // provide a simple way to expose static directories
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

  // provide a simple way to expose static files
  server.decorate('server', 'exposeStaticFile', function (routePath, filePath) {
    this.route({
      path: routePath,
      method: 'GET',
      handler: {
        file: filePath
      }
    });
  });

  // attach the app name to the server, so we can be sure we are actually talking to kibana
  server.ext('onPreResponse', function (request, reply) {
    var response = request.response;

    if (response.isBoom) {
      response.output.headers['x-app-name'] = kibana.name;
      response.output.headers['x-app-version'] = kibana.version;
    } else {
      response.header('x-app-name', kibana.name);
      response.header('x-app-version', kibana.version);
    }

    return reply.continue();
  });

  server.route({
    path: '/',
    method: 'GET',
    handler: function (req, reply) {
      reply.redirect(config.get('kibana.defaultRoute'));
    }
  });
};
