module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let fs = require('fs');
  let Boom = require('boom');
  let Hapi = require('hapi');
  let parse = require('url').parse;
  let format = require('url').format;

  let getDefaultRoute = require('./getDefaultRoute');

  server = kbnServer.server = new Hapi.Server();

  // Create a new connection
  var connectionOptions = {
    host: config.get('server.host'),
    port: config.get('server.port'),
    routes: {
      cors: config.get('server.cors')
    }
  };

  // enable tls if ssl key and cert are defined
  if (config.get('server.ssl.key') && config.get('server.ssl.cert')) {
    connectionOptions.tls = {
      key: fs.readFileSync(config.get('server.ssl.key')),
      cert: fs.readFileSync(config.get('server.ssl.cert'))
    };
  }

  server.connection(connectionOptions);

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

  // helper for creating view managers for servers
  server.decorate('server', 'setupViews', function (path, engines) {
    this.views({
      path: path,
      isCached: config.get('optimize.viewCaching'),
      engines: _.assign({ jade: require('jade') }, engines || {})
    });
  });

  server.decorate('server', 'redirectToSlash', function (route) {
    this.route({
      path: route,
      method: 'GET',
      handler: function (req, reply) {
        return reply.redirect(format({
          search: req.url.search,
          pathname: req.url.pathname + '/',
        }));
      }
    });
  });

  // attach the app name to the server, so we can be sure we are actually talking to kibana
  server.ext('onPreResponse', function (req, reply) {
    let response = req.response;

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
      return reply.view('rootRedirect', {
        hashRoute: `${config.get('server.basePath')}/app/kibana`,
        defaultRoute: getDefaultRoute(kbnServer),
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/{p*}',
    handler: function (req, reply) {
      let path = req.path;
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

  return kbnServer.mixin(require('./xsrf'));
};
