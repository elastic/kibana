import { ProxyConfigCollection } from './server/proxy_config_collection';

module.exports = function (kibana) {
  const { resolve, join, sep } = require('path');
  const { parse: parseUri, format: formatUri } = require('url');
  const Joi = require('joi');
  const Boom = require('boom');
  const modules = resolve(__dirname, 'public/webpackShims/');
  const src = resolve(__dirname, 'public/src/');
  const { existsSync } = require('fs');
  const { startsWith, endsWith } = require('lodash');

  const apps = [
    {
      title: 'Console',
      description: 'JSON aware developer\'s interface to ElasticSearch',
      main: 'plugins/console/console',
      icon: 'plugins/console/logo.svg',
      injectVars: function (server, options) {
        let { proxyTargets, defaultServerUrl } = options;

        if (!defaultServerUrl) {
          if (proxyTargets) defaultServerUrl = proxyTargets[0];
          else defaultServerUrl = 'http://localhost:9200';
        }

        return { proxyTargets, defaultServerUrl };
      }
    }
  ];

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

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        defaultServerUrl: Joi.string().optional(),
        proxyTargets: Joi.array().items(Joi.string()).optional(),
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
            uri: Joi.string().uri({
              allowRelative: false,
              shema: ['http:', 'https:'],
            }),
          }).unknown(true),
        },

        pre: [
          {
            assign: 'proxyTarget',
            method(req, reply) {
              const rawUri = req.query.uri;
              req.query.uri = null; // prevent accidental usage

              const { protocol, hostname, port, pathname, search, hash } = parseUri(rawUri);
              reply(formatUri({
                protocol,
                hostname,
                port,
                pathname: resolve(pathname), // resolve any path traversal
                search,
                hash
              }));
            }
          },

          function checkProxyTarget(req, reply) {
            const uri = req.pre.proxyTarget;

            if (!options.proxyTargets) return reply();
            if (options.proxyTargets.some(t => uri.startsWith(t))) {
              reply();
            } else {
              const err = Boom.forbidden();
              err.output.payload = `Error connecting to '${uri}':\n\nUnable to send requests to that url.`;
              err.output.headers['content-type'] = 'text/plain';
              reply(err);
            }
          },

          function checkProxyFilters(req, reply) {
            const uri = req.pre.proxyTarget;

            if (filters.some(re => re.test(uri))) {
              return reply();
            }

            const err = Boom.forbidden();
            err.output.payload = `Error connecting to '${uri}':\n\nUnable to send requests to that url.`;
            err.output.headers['content-type'] = 'text/plain';
            reply(err);
          }
        ],

        handler(req, reply) {
          const uri = req.pre.proxyTarget;

          reply.proxy({
            uri,
            xforward: true,
            passThrough: true,
            onResponse(err, res, request, reply, settings, ttl) {
              if (err != null) {
                reply(`Error connecting to '${uri}':\n\n${err.message}`)
                  .type(`text/plain`)
                  .code(502);
              } else {
                reply(null, res);
              }
            },

            ...proxyConfigCollection.configForUri(uri)
          })
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
          },
        }
      });

      server.route({
        path: '/api/console/proxy',
        method: 'GET',
        config: {
          ...proxyRouteConfig
        }
      })

      server.route({
        path: '/api/console/api_server',
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

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'moment_src/moment' + sep),
        join(src, 'sense_editor/mode/worker.js')
      ]
    }
  })
};
