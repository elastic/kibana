import Joi from 'joi';
import Boom from 'boom';
import apiServer from './api_server/server';
import { existsSync } from 'fs';
import { resolve, join, sep } from 'path';
import { startsWith, endsWith } from 'lodash';
import { ProxyConfigCollection } from './server/proxy_config_collection';

export default function (kibana) {
  const modules = resolve(__dirname, 'public/webpackShims/');
  const src = resolve(__dirname, 'public/src/');

  const apps = [];

  if (existsSync(resolve(__dirname, 'public/tests'))) {
    apps.push({
      title: 'Console Tests',
      id: 'sense-tests',
      main: 'plugins/console/tests',
      hidden: true
      //listed: false // uncomment after https://github.com/elastic/kibana/pull/4755
    });
  }

  return new kibana.Plugin({
    id: 'console',
    require: [ 'elasticsearch' ],

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        proxyFilter: Joi.array().items(Joi.string()).single().default(['.*']),
        ssl: Joi.object({
          verify: Joi.boolean(),
        }).default(),
        proxyConfig: Joi.array().items(
          Joi.object().keys({
            match: Joi.object().keys({
              protocol: Joi.string().default('*'),
              host: Joi.string().default('*'),
              port: Joi.string().default('*'),
              path: Joi.string().default('*')
            }),

            timeout: Joi.number(),
            ssl: Joi.object().keys({
              verify: Joi.boolean(),
              ca: Joi.array().single().items(Joi.string()),
              cert: Joi.string(),
              key: Joi.string()
            }).default()
          })
        ).default([
          {
            match: {
              protocol: '*',
              host: '*',
              port: '*',
              path: '*'
            },

            timeout: 180000,
            ssl: {
              verify: true
            }
          }
        ])
      }).default();
    },

    init: function (server, options) {
      const filters = options.proxyFilter.map(str => new RegExp(str));

      if (options.ssl && options.ssl.verify) {
        throw new Error('sense.ssl.verify is no longer supported.');
      }

      const proxyConfigCollection = new ProxyConfigCollection(options.proxyConfig);
      const proxyRouteConfig = {
        validate: {
          query: Joi.object().keys({
            uri: Joi.string()
          }).unknown(true),
        },

        pre: [
          function filterUri(req, reply) {
            const { uri } = req.query;

            if (!filters.some(re => re.test(uri))) {
              const err = Boom.forbidden();
              err.output.payload = `Error connecting to '${uri}':\n\nUnable to send requests to that url.`;
              err.output.headers['content-type'] = 'text/plain';
              reply(err);
            } else {
              reply();
            }
          }
        ],

        handler(req, reply) {
          let baseUri = server.config().get('elasticsearch.url');
          let { uri:path } = req.query;

          baseUri = baseUri.replace(/\/+$/, '');
          path = path.replace(/^\/+/, '');
          const uri = baseUri + '/' + path;

          const requestHeadersWhitelist = server.config().get('elasticsearch.requestHeadersWhitelist');
          const filterHeaders = server.plugins.elasticsearch.filterHeaders;
          reply.proxy({
            mapUri: function (request, done) {
              done(null, uri, filterHeaders(request.headers, requestHeadersWhitelist));
            },
            xforward: true,
            onResponse(err, res, request, reply, settings, ttl) {
              if (err != null) {
                reply(`Error connecting to '${uri}':\n\n${err.message}`).type('text/plain').statusCode = 502;
              } else {
                reply(null, res);
              }
            },

            ...proxyConfigCollection.configForUri(uri)
          });
        }
      };

      server.route({
        path: '/api/console/proxy',
        method: '*',
        config: {
          ...proxyRouteConfig,

          payload: {
            output: 'stream',
            parse: false
          }
        }
      });

      server.route({
        path: '/api/console/proxy',
        method: 'GET',
        config: {
          ...proxyRouteConfig
        }
      });

      server.route({
        path: '/api/console/api_server',
        method: ['GET', 'POST'],
        handler: function (req, reply) {
          const { sense_version, apis } = req.query;
          if (!apis) {
            reply(Boom.badRequest('"apis" is a required param.'));
            return;
          }

          return apiServer.resolveApi(sense_version, apis.split(','), reply);
        }
      });

      const testApp = kibana.uiExports.apps.hidden.byId['sense-tests'];
      if (testApp) {
        server.route({
          path: '/app/sense-tests',
          method: 'GET',
          handler: function (req, reply) {
            return reply.renderApp(testApp);
          }
        });
      }
    },

    uiExports: {
      apps: apps,
      hacks: ['plugins/console/hacks/register'],
      devTools: ['plugins/console/console'],

      injectDefaultVars(server, options) {
        const varsToInject = options;
        varsToInject.elasticsearchUrl = server.config().get('elasticsearch.url');
        return varsToInject;
      },

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'moment_src/moment' + sep),
        join(src, 'sense_editor/mode/worker.js')
      ]
    }
  });
}
