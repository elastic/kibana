module.exports = function (kibana) {
  let { resolve, join, sep } = require('path');
  let Joi = require('joi');
  let Boom = require('boom');
  let modules = resolve(__dirname, 'public/webpackShims/');

  return new kibana.Plugin({
    id: 'sense',

    init: function (server, options) {
      // http://hapijs.com/api/8.8.1#route-configuration
      server.route({
        path: '/api/sense/proxy',
        method: ['*', 'GET'],
        config: {
          handler: {
            proxy: {
              mapUri: function (req, cb) {
                let { uri } = req.query;
                if (!uri) {
                  cb(Boom.badRequest('URI is a required param.'));
                }
                else {
                  cb(null, uri);
                }
              },
              passThrough: true,
              xforward: true,
              onResponse: function (err, res, request, reply, settings, ttl) {
                if (err != null) {
                  reply("Error connecting to '" + request.query.uri + "':\n\n" + err.message).type("text/plain").statusCode = 502;
                } else {
                  reply(null, res);
                }
              }
            }
          }
        }
      });

      server.route({
        path: '/api/sense/api_server',
        method: ['GET', 'POST'],
        handler: function (req, reply) {

          let server = require('./public/api_server/server');
          let {sense_version, apis} = req.query;
          if (!apis) {
            reply(Boom.badRequest('"apis" is a required param.'));
            return;
          }

          return server.resolveApi(sense_version, apis.split(","), reply);
        }
      });

      server.route({
        path: '/app/sense-tests',
        method: 'GET',
        handler: function (req, reply) {
          return reply.renderApp(kibana.uiExports.apps.hidden.byId['sense-tests']);
        }
      });
    },

    uiExports: {
      apps: [{
        title: 'Sense',
        description: 'JSON aware developer\'s interface to ElasticSearch',
        icon: 'plugins/sense/favicon.ico',
        main: 'plugins/sense',
        autoload: kibana.autoload.styles
      },
        {
          title: 'Sense Tests',
          id: 'sense-tests',
          main: 'plugins/sense/tests',
          autoload: kibana.autoload.styles,
          hidden: true
          //listed: false // uncomment after https://github.com/elastic/kibana/pull/4755
        }],

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'vendor/moment_src/moment' + sep),
        resolve(modules, 'sense_editor/mode/worker.js'),
      ]
    }
  })
};
