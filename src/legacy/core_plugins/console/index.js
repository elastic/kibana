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
import { first } from 'rxjs/operators';
import { resolve, join, sep } from 'path';
import url from 'url';
import { has, isEmpty, head, pick } from 'lodash';

import { resolveApi } from './api_server/server';
import { addExtensionSpecFilePath } from './api_server/spec';
import { setHeaders } from './server/set_headers';

import {
  ProxyConfigCollection,
  getElasticsearchProxyConfig,
  createProxyRoute
} from './server';

function filterHeaders(originalHeaders, headersToKeep) {
  const normalizeHeader = function (header) {
    if (!header) {
      return '';
    }
    header = header.toString();
    return header.trim().toLowerCase();
  };

  // Normalize list of headers we want to allow in upstream request
  const headersToKeepNormalized = headersToKeep.map(normalizeHeader);

  return pick(originalHeaders, headersToKeepNormalized);
}

export default function (kibana) {
  const modules = resolve(__dirname, 'public/webpackShims/');
  const src = resolve(__dirname, 'public/src/');

  let defaultVars;
  const apps = [];
  return new kibana.Plugin({
    id: 'console',
    require: ['elasticsearch'],

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

    uiCapabilities() {
      return {
        dev_tools: {
          show: true,
          save: true,
        },
      };
    },

    async init(server, options) {
      server.expose('addExtensionSpecFilePath', addExtensionSpecFilePath);
      if (options.ssl && options.ssl.verify) {
        throw new Error('sense.ssl.verify is no longer supported.');
      }

      const config = server.config();
      const legacyEsConfig = await server.newPlatform.setup.core.elasticsearch.legacy.config$.pipe(first()).toPromise();
      const proxyConfigCollection = new ProxyConfigCollection(options.proxyConfig);
      const proxyPathFilters = options.proxyFilter.map(str => new RegExp(str));

      defaultVars = {
        elasticsearchUrl: url.format(
          Object.assign(url.parse(head(legacyEsConfig.hosts)), { auth: false })
        ),
      };

      server.route(createProxyRoute({
        baseUrl: head(legacyEsConfig.hosts),
        pathFilters: proxyPathFilters,
        getConfigForReq(req, uri) {
          const filteredHeaders = filterHeaders(req.headers, legacyEsConfig.requestHeadersWhitelist);
          const headers = setHeaders(filteredHeaders, legacyEsConfig.customHeaders);

          if (!isEmpty(config.get('console.proxyConfig'))) {
            return {
              ...proxyConfigCollection.configForUri(uri),
              headers,
            };
          }

          return {
            ...getElasticsearchProxyConfig(legacyEsConfig),
            headers,
          };
        }
      }));

      server.route({
        path: '/api/console/api_server',
        method: ['GET', 'POST'],
        handler: function (req, h) {
          const { sense_version: version, apis } = req.query;
          if (!apis) {
            throw Boom.badRequest('"apis" is a required param.');
          }

          return resolveApi(version, apis.split(','), h);
        }
      });
    },

    uiExports: {
      apps: apps,
      hacks: ['plugins/console/hacks/register'],
      devTools: ['plugins/console/console'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),

      injectDefaultVars: () => defaultVars,

      noParse: [
        join(modules, 'ace' + sep),
        join(modules, 'moment_src/moment' + sep),
        join(src, 'sense_editor/mode/worker.js')
      ]
    }
  });
}
