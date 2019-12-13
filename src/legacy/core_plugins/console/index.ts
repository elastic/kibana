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
import { resolve, join } from 'path';
import url from 'url';
import { has, isEmpty, head, pick } from 'lodash';

// @ts-ignore
import mappings from './mappings.json';

// @ts-ignore
import { addProcessorDefinition } from './server/api_server/es_6_0/ingest';
// @ts-ignore
import { resolveApi } from './server/api_server/server';
// @ts-ignore
import { addExtensionSpecFilePath } from './server/api_server/spec';
// @ts-ignore
import { setHeaders } from './server/set_headers';
// @ts-ignore
import { ProxyConfigCollection, getElasticsearchProxyConfig, createProxyRoute } from './server';

function filterHeaders(originalHeaders: any, headersToKeep: any) {
  const normalizeHeader = function(header: any) {
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

// eslint-disable-next-line
export default function(kibana: any) {
  const npSrc = resolve(__dirname, 'public/np_ready');

  let defaultVars: any;
  return new kibana.Plugin({
    id: 'console',
    require: ['elasticsearch'],

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        proxyFilter: Joi.array()
          .items(Joi.string())
          .single()
          .default(['.*']),
        ssl: Joi.object({
          verify: Joi.boolean(),
        }).default(),
        proxyConfig: Joi.array()
          .items(
            Joi.object().keys({
              match: Joi.object().keys({
                protocol: Joi.string().default('*'),
                host: Joi.string().default('*'),
                port: Joi.string().default('*'),
                path: Joi.string().default('*'),
              }),

              timeout: Joi.number(),
              ssl: Joi.object()
                .keys({
                  verify: Joi.boolean(),
                  ca: Joi.array()
                    .single()
                    .items(Joi.string()),
                  cert: Joi.string(),
                  key: Joi.string(),
                })
                .default(),
            })
          )
          .default(),
      }).default();
    },

    deprecations() {
      return [
        (settings: any, log: any) => {
          if (has(settings, 'proxyConfig')) {
            log(
              'Config key "proxyConfig" is deprecated. Configuration can be inferred from the "elasticsearch" settings'
            );
          }
        },
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

    async init(server: any, options: any) {
      server.expose('addExtensionSpecFilePath', addExtensionSpecFilePath);
      server.expose('addProcessorDefinition', addProcessorDefinition);

      if (options.ssl && options.ssl.verify) {
        throw new Error('sense.ssl.verify is no longer supported.');
      }

      const config = server.config();
      const legacyEsConfig = await server.newPlatform.__internals.elasticsearch.legacy.config$
        .pipe(first())
        .toPromise();
      const proxyConfigCollection = new ProxyConfigCollection(options.proxyConfig);
      const proxyPathFilters = options.proxyFilter.map((str: string) => new RegExp(str));

      defaultVars = {
        elasticsearchUrl: url.format(
          Object.assign(url.parse(head(legacyEsConfig.hosts)), { auth: false })
        ),
      };

      server.route(
        createProxyRoute({
          hosts: legacyEsConfig.hosts,
          pathFilters: proxyPathFilters,
          getConfigForReq(req: any, uri: any) {
            const filteredHeaders = filterHeaders(
              req.headers,
              legacyEsConfig.requestHeadersWhitelist
            );
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
          },
        })
      );

      server.route({
        path: '/api/console/api_server',
        method: ['GET', 'POST'],
        handler(req: any, h: any) {
          const { sense_version: version, apis } = req.query;
          if (!apis) {
            throw Boom.badRequest('"apis" is a required param.');
          }

          return resolveApi(version, apis.split(','), h);
        },
      });
    },

    uiExports: {
      devTools: [resolve(__dirname, 'public/legacy')],
      styleSheetPaths: resolve(npSrc, 'application/styles/index.scss'),
      injectDefaultVars: () => defaultVars,
      noParse: [join(npSrc, 'application/models/legacy_core_editor/mode/worker/worker.js')],
      mappings,
    },
  } as any);
}
