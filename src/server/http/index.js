module.exports = function (kbnServer, server, config) {
  var Boom = require('boom');
  var parse = require('url').parse;
  var format = require('url').format;

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
  server.ext('onPreResponse', function (req, reply) {
    var response = req.response;

    if (response.isBoom) {
      response.output.headers['x-app-name'] = kbnServer.name;
      response.output.headers['x-app-version'] = kbnServer.version;
    } else {
      response.header('x-app-name', kbnServer.name);
      response.header('x-app-version', kbnServer.version);
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

  server.route({
    method: 'GET',
    path: '/{p*}',
    handler: function (req, reply) {
      var path = req.path;
      if (path === '/' || path.charAt(path.length - 1) !== '/') {
        return reply(Boom.notFound());
      }

      return reply.redirect(format({
        search: req.url.search,
        pathname: path.slice(0, -1),
      }))
      .permanent(true);
    }
  });
};
