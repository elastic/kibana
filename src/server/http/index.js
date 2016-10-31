import versionCheckMixin from './version_check';
import { shortUrlAssertValid } from './short_url_assert_valid';

module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');
  let fs = require('fs');
  let Boom = require('boom');
  let Hapi = require('hapi');
  let parse = require('url').parse;
  let format = require('url').format;

  let getDefaultRoute = require('./getDefaultRoute');

  server = kbnServer.server = new Hapi.Server();

  const shortUrlLookup = require('./short_url_lookup')(server);
  kbnServer.mixin(require('./register_hapi_plugins'));

  // Create a new connection
  let connectionOptions = {
    host: config.get('server.host'),
    port: config.get('server.port'),
    state: {
      strictHeader: false
    },
    routes: {
      cors: config.get('server.cors'),
      payload: {
        maxBytes: config.get('server.maxPayloadBytes')
      }
    }
  };

  // enable tls if ssl key and cert are defined
  if (config.get('server.ssl.key') && config.get('server.ssl.cert')) {
    connectionOptions.tls = {
      key: fs.readFileSync(config.get('server.ssl.key')),
      cert: fs.readFileSync(config.get('server.ssl.cert')),
      // The default ciphers in node 0.12.x include insecure ciphers, so until
      // we enforce a more recent version of node, we craft our own list
      // @see https://github.com/nodejs/node/blob/master/src/node_constants.h#L8-L28
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-SHA256',
        'DHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'DHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES256-SHA256',
        'DHE-RSA-AES256-SHA256',
        'HIGH',
        '!aNULL',
        '!eNULL',
        '!EXPORT',
        '!DES',
        '!RC4',
        '!MD5',
        '!PSK',
        '!SRP',
        '!CAMELLIA'
      ].join(':'),
      // We use the server's cipher order rather than the client's to prevent
      // the BEAST attack
      honorCipherOrder: true
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
      },
      config: {auth: false}
    });
  });

  // provide a simple way to expose static files
  server.decorate('server', 'exposeStaticFile', function (routePath, filePath) {
    this.route({
      path: routePath,
      method: 'GET',
      handler: {
        file: filePath
      },
      config: {auth: false}
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
      response.output.headers['kbn-name'] = kbnServer.name;
      response.output.headers['kbn-version'] = kbnServer.version;
    } else {
      response.header('kbn-name', kbnServer.name);
      response.header('kbn-version', kbnServer.version);
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

  server.route({
    method: 'GET',
    path: '/goto/{urlId}',
    handler: async function (request, reply) {
      try {
        const url = await shortUrlLookup.getUrl(request.params.urlId);
        shortUrlAssertValid(url);
        reply().redirect(config.get('server.basePath') + url);
      } catch (err) {
        reply(err);
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/shorten',
    handler: async function (request, reply) {
      try {
        shortUrlAssertValid(request.payload.url);
        const urlId = await shortUrlLookup.generateUrlId(request.payload.url);
        reply(urlId);
      } catch (err) {
        reply(err);
      }
    }
  });

  kbnServer.mixin(versionCheckMixin);

  return kbnServer.mixin(require('./xsrf'));
};
