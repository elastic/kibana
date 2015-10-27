module.exports = function (kibana) {
  let { resolve, join, sep } = require('path');
  let Joi = require('joi');
  let Boom = require('boom');
  let modules = resolve(__dirname, 'public/webpackShims/');
  let src = resolve(__dirname, 'public/src/');
  let { existsSync } = require('fs');
  const { startsWith, endsWith } = require('lodash');

  const apps = [
    {
      title: 'Sense',
      description: 'JSON aware developer\'s interface to ElasticSearch',
      icon: 'plugins/sense/bonsai.png',
      main: 'plugins/sense/sense',
      autoload: kibana.autoload.styles,
      injectVars: function (server, options) {
        return options;
      }
    }
  ];

  if (existsSync(resolve(__dirname, 'public/tests'))) {
    apps.push({
      title: 'Sense Tests',
      id: 'sense-tests',
      main: 'plugins/sense/tests',
      autoload: kibana.autoload.styles,
      hidden: true
      //listed: false // uncomment after https://github.com/elastic/kibana/pull/4755
    });
  }

  return new kibana.Plugin({
    id: 'sense',

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultServerUrl: Joi.string().default('http://localhost:9200'),
        proxyFilter: Joi.array().items(Joi.string()).single().default(['.*']),
      }).default();
    },

    init: function (server, options) {
      const filters = options.proxyFilter.map(str => new RegExp(str));

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
                  return;
                }

                if (!filters.some(re => re.test(uri))) {
                  const err = Boom.forbidden();
                  err.output.payload = 'Unable to send requests to that url';
                  err.output.headers['content-type'] = 'text/plain';
                  cb(err);
                  return;
                }

                cb(null, uri);
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
          let server = require('./api_server/server');
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
      apps: apps,

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'moment_src/moment' + sep),
        join(src, 'sense_editor/mode/worker.js')
      ]
    }
  })
};
