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

import { first } from 'rxjs/operators';
import { resolve } from 'path';
import url from 'url';
import { has, isEmpty, head, pick } from 'lodash';

// @ts-ignore
// import { setHeaders } from './server/set_headers';
// @ts-ignore
// import { ProxyConfigCollection, getElasticsearchProxyConfig, createProxyRoute } from './server';

let _legacyEsConfig: any;
export const readLegacyEsConfig = () => {
  return _legacyEsConfig;
};

import { isPlainObject } from 'lodash';

export function setHeaders(originalHeaders, newHeaders) {
  if (!isPlainObject(originalHeaders)) {
    throw new Error(
      `Expected originalHeaders to be an object, but ${typeof originalHeaders} given`
    );
  }
  if (!isPlainObject(newHeaders)) {
    throw new Error(`Expected newHeaders to be an object, but ${typeof newHeaders} given`);
  }

  return {
    ...originalHeaders,
    ...newHeaders,
  };
}

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
  return new kibana.Plugin({
    id: 'console_legacy',

    async init(server: any, options: any) {
      // server.expose('addExtensionSpecFilePath', addExtensionSpecFilePath);
      // server.expose('addProcessorDefinition', addProcessorDefinition);

      // const config = server.config();
      _legacyEsConfig = await server.newPlatform.__internals.elasticsearch.legacy.config$
        .pipe(first())
        .toPromise();
      // const proxyConfigCollection = new ProxyConfigCollection(options.proxyConfig);
      // const proxyPathFilters = options.proxyFilter.map((str: string) => new RegExp(str));

      // defaultVars = {
      //   elasticsearchUrl: url.format(
      //     Object.assign(url.parse(head(legacyEsConfig.hosts)), { auth: false })
      //   ),
      // };

      // server.route(
      //   createProxyRoute({
      //     hosts: legacyEsConfig.hosts,
      //     pathFilters: proxyPathFilters,
      //     getConfigForReq(req: any, uri: any) {
      //       const filteredHeaders = filterHeaders(
      //         req.headers,
      //         legacyEsConfig.requestHeadersWhitelist
      //       );
      //       const headers = setHeaders(filteredHeaders, legacyEsConfig.customHeaders);
      //
      //       if (!isEmpty(config.get('console.proxyConfig'))) {
      //         return {
      //           ...proxyConfigCollection.configForUri(uri),
      //           headers,
      //         };
      //       }
      //
      //       return {
      //         ...getElasticsearchProxyConfig(legacyEsConfig),
      //         headers,
      //       };
      //     },
      //   })
      // );
      //
      // server.route({
      //   path: '/api/console/api_server',
      //   method: ['GET', 'POST'],
      //   handler(req: any, h: any) {
      //     const { sense_version: version, apis } = req.query;
      //     if (!apis) {
      //       throw Boom.badRequest('"apis" is a required param.');
      //     }
      //
      //     return resolveApi(version, apis.split(','), h);
      //   },
      // });
    },

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/styles/index.scss'),
      // injectDefaultVars: () => defaultVars,
    },
  } as any);
}
