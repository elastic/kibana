/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';
import { resolveApi } from './api_server/server';
import { resolve, join, sep } from 'path';
import { has, isEmpty } from 'lodash';
import setHeaders from '../elasticsearch/lib/set_headers';
import { addExtensionSpecFilePath } from './api_server/spec';

import {
  ProxyConfigCollection,
  getElasticsearchProxyConfig,
  createProxyRoute
} from './server';

export default function (kibana) {
  const modules = resolve(__dirname, 'public/webpackShims/');
  const src = resolve(__dirname, 'public/src/');

  const apps = [];
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
      server.expose('addExtensionSpecFilePath', addExtensionSpecFilePath);
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
          const filteredHeaders = filterHeaders(req.headers, whitelist);
          const headers = setHeaders(filteredHeaders, config.get('elasticsearch.customHeaders'));

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
          const { sense_version: version, apis } = req.query;
          if (!apis) {
            reply(Boom.badRequest('"apis" is a required param.'));
            return;
          }

          return resolveApi(version, apis.split(','), reply);
        }
      });
    },

    uiExports: {
      apps: apps,
      hacks: ['plugins/console/hacks/register'],
      devTools: ['plugins/console/console'],

      injectDefaultVars(server) {
        return {
          elasticsearchUrl: server.config().get('elasticsearch.url')
        };
      },

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'moment_src/moment' + sep),
        join(src, 'sense_editor/mode/worker.js')
      ]
    }
  });
}
