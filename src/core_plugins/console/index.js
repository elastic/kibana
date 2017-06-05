import Boom from 'boom';
import apiServer from './api_server/server';
import { existsSync } from 'fs';
import { resolve, join, sep } from 'path';
import { has, isEmpty } from 'lodash';

import {
  ProxyConfigCollection,
  getElasticsearchProxyConfig,
  createProxyRoute
} from './server';

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
        ).default()
      }).default();
    },

    deprecations: function () {
      return [
        (settings, log) => {
          if (has(settings, 'proxyConfig')) {
            log('Config key "proxyConfig" is deprecated. Configuration can be inferred from the "elasticsearch" settings');
          }
        }
      ];
    },

    init: function (server, options) {
      if (options.ssl && options.ssl.verify) {
        throw new Error('sense.ssl.verify is no longer supported.');
      }

      const config = server.config();
      const { filterHeaders } = server.plugins.elasticsearch;
      const proxyConfigCollection = new ProxyConfigCollection(options.proxyConfig);
      const proxyPathFilters = options.proxyFilter.map(str => new RegExp(str));

      server.route(createProxyRoute({
        baseUrl: config.get('elasticsearch.url'),
        pathFilters: proxyPathFilters,
        getConfigForReq(req, uri) {
          const whitelist = config.get('elasticsearch.requestHeadersWhitelist');
          const headers = filterHeaders(req.headers, whitelist);

          if (!isEmpty(config.get('console.proxyConfig'))) {
            return {
              ...proxyConfigCollection.configForUri(uri),
              headers,
            };
          }

          return {
            ...getElasticsearchProxyConfig(server),
            headers,
          };
        }
      }));

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
