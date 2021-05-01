/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent, IncomingMessage } from 'http';
import * as url from 'url';
import { pick, trimStart, trimEnd } from 'lodash';

import { ESConfigForProxy } from '../../../../../types';
import {
  getElasticsearchProxyConfig,
  ProxyConfigCollection,
  proxyRequest,
  setHeaders,
} from '../../../../../lib';

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
  const normalizeHeader = function (header: string) {
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
    };
  }

  return {
    ...getElasticsearchProxyConfig(esConfig),
    headers: newHeaders,
  };
}

export const handleEsRequest = async (
  method,
  path,
  body,
  query,
  headers,
  proxyHeaders,
  response,
  log,
  readLegacyESConfig,
  pathFilters,
  proxyConfigCollection
) => {
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
      const {
        timeout,
        agent,
        headers: requestConfigHeaders,
        rejectUnauthorized,
      } = getRequestConfig(headers, legacyConfig, proxyConfigCollection, uri.toString());

      const requestHeaders = {
        ...requestConfigHeaders,
        ...proxyHeaders,
      };

      esIncomingMessage = await proxyRequest({
        method: method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head',
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
