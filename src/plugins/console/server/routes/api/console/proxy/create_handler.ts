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

import { Agent, IncomingMessage } from 'http';
import * as url from 'url';
import { pick, trimStart, trimEnd } from 'lodash';

import { KibanaRequest, RequestHandler } from 'kibana/server';

import { ESConfigForProxy } from '../../../../types';
import {
  getElasticsearchProxyConfig,
  ProxyConfigCollection,
  proxyRequest,
  setHeaders,
} from '../../../../lib';

// TODO: find a better way to get information from the request like remoteAddress and remotePort
// for forwarding.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '../../../../../../../core/server/http/router';

import { RouteDependencies } from '../../../';

import { Body, Query } from './validation_config';

function toURL(base: string, path: string) {
  const urlResult = new url.URL(`${trimEnd(base, '/')}/${trimStart(path, '/')}`);
  // Appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)
  if (!urlResult.searchParams.get('pretty')) {
    urlResult.searchParams.append('pretty', 'true');
  }
  return urlResult;
}

function filterHeaders(originalHeaders: object, headersToKeep: string[]): object {
  const normalizeHeader = function (header: any) {
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

function getRequestConfig(
  headers: object,
  esConfig: ESConfigForProxy,
  proxyConfigCollection: ProxyConfigCollection,
  uri: string
): { agent: Agent; timeout: number; headers: object; rejectUnauthorized?: boolean } {
  const filteredHeaders = filterHeaders(headers, esConfig.requestHeadersWhitelist);
  const newHeaders = setHeaders(filteredHeaders, esConfig.customHeaders);

  if (proxyConfigCollection.hasConfig()) {
    return {
      ...proxyConfigCollection.configForUri(uri),
      headers: newHeaders,
    } as any;
  }

  return {
    ...getElasticsearchProxyConfig(esConfig),
    headers: newHeaders,
  };
}

function getProxyHeaders(req: KibanaRequest) {
  const headers = Object.create(null);

  // Scope this proto-unsafe functionality to where it is being used.
  function extendCommaList(obj: Record<string, any>, property: string, value: any) {
    obj[property] = (obj[property] ? obj[property] + ',' : '') + value;
  }

  const _req = ensureRawRequest(req);

  if (_req?.info?.remotePort && _req?.info?.remoteAddress) {
    // see https://git.io/vytQ7
    extendCommaList(headers, 'x-forwarded-for', _req.info.remoteAddress);
    extendCommaList(headers, 'x-forwarded-port', _req.info.remotePort);
    extendCommaList(headers, 'x-forwarded-proto', _req.server.info.protocol);
    extendCommaList(headers, 'x-forwarded-host', _req.info.host);
  }

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['content-type'] = contentType;
  }
  return headers;
}

export const createHandler = ({
  log,
  proxy: { readLegacyESConfig, pathFilters, proxyConfigCollection },
}: RouteDependencies): RequestHandler<unknown, Query, Body> => async (ctx, request, response) => {
  const { body, query } = request;
  const { path, method } = query;

  if (!pathFilters.some((re) => re.test(path))) {
    return response.forbidden({
      body: `Error connecting to '${path}':\n\nUnable to send requests to that path.`,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  const legacyConfig = await readLegacyESConfig();
  const { hosts } = legacyConfig;
  let esIncomingMessage: IncomingMessage;

  for (let idx = 0; idx < hosts.length; ++idx) {
    const host = hosts[idx];
    try {
      const uri = toURL(host, path);

      // Because this can technically be provided by a settings-defined proxy config, we need to
      // preserve these property names to maintain BWC.
      const { timeout, agent, headers, rejectUnauthorized } = getRequestConfig(
        request.headers,
        legacyConfig,
        proxyConfigCollection,
        uri.toString()
      );

      const requestHeaders = {
        ...headers,
        ...getProxyHeaders(request),
      };

      esIncomingMessage = await proxyRequest({
        method: method.toLowerCase() as any,
        headers: requestHeaders,
        uri,
        timeout,
        payload: body,
        rejectUnauthorized,
        agent,
      });

      break;
    } catch (e) {
      // If we reached here it means we hit a lower level network issue than just, for e.g., a 500.
      // We try contacting another node in that case.
      log.error(e);
      if (idx === hosts.length - 1) {
        log.warn(`Could not connect to any configured ES node [${hosts.join(', ')}]`);
        return response.customError({
          statusCode: 502,
          body: e,
        });
      }
      // Otherwise, try the next host...
    }
  }

  const {
    statusCode,
    statusMessage,
    headers: { warning },
  } = esIncomingMessage!;

  if (method.toUpperCase() !== 'HEAD') {
    return response.custom({
      statusCode: statusCode!,
      body: esIncomingMessage!,
      headers: {
        warning: warning || '',
      },
    });
  }

  return response.custom({
    statusCode: statusCode!,
    body: `${statusCode} - ${statusMessage}`,
    headers: {
      warning: warning || '',
      'Content-Type': 'text/plain',
    },
  });
};
