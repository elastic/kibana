/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent, IncomingMessage } from 'http';
import { pick } from 'lodash';
import { SemVer } from 'semver';

import { KibanaRequest, RequestHandler } from '@kbn/core/server';

// TODO: find a better way to get information from the request like remoteAddress and remotePort
// for forwarding.
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { ESConfigForProxy } from '../../../../types';
import {
  getElasticsearchProxyConfig,
  ProxyConfigCollection,
  proxyRequest,
  setHeaders,
} from '../../../../lib';

import { RouteDependencies } from '../../..';

import { Body, Query } from './validation_config';
import { toURL } from '../../../../lib/utils';

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

export function getRequestConfig(
  headers: object,
  esConfig: ESConfigForProxy,
  uri: string,
  kibanaVersion: SemVer,
  proxyConfigCollection?: ProxyConfigCollection
): { agent: Agent; timeout: number; headers: object; rejectUnauthorized?: boolean } {
  const filteredHeaders = filterHeaders(headers, esConfig.requestHeadersWhitelist);
  const newHeaders = setHeaders(filteredHeaders, esConfig.customHeaders);

  if (kibanaVersion.major < 8) {
    // In 7.x we still support the proxyConfig setting defined in kibana.yml
    // From 8.x we don't support it anymore so we don't try to read it here.
    if (proxyConfigCollection!.hasConfig()) {
      return {
        ...proxyConfigCollection!.configForUri(uri),
        headers: newHeaders,
      };
    }
  }

  return {
    ...getElasticsearchProxyConfig(esConfig),
    headers: newHeaders,
  };
}

function getProxyHeaders(req: KibanaRequest) {
  const headers = Object.create(null);

  // Scope this proto-unsafe functionality to where it is being used.
  function extendCommaList(obj: Record<string, any>, property: string, value: string) {
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

export const createHandler =
  ({
    log,
    proxy: { readLegacyESConfig, pathFilters, proxyConfigCollection },
    kibanaVersion,
  }: RouteDependencies): RequestHandler<unknown, Query, Body> =>
  async (ctx, request, response) => {
    const { body, query } = request;
    const { method, path, withProductOrigin } = query;

    if (kibanaVersion.major < 8) {
      // The "console.proxyFilter" setting in kibana.yaml has been deprecated in 8.x
      // We only read it on the 7.x branch
      if (!pathFilters!.some((re) => re.test(path))) {
        return response.forbidden({
          body: `Error connecting to '${path}':\n\nUnable to send requests to that path.`,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
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
          uri.toString(),
          kibanaVersion,
          proxyConfigCollection
        );

        const requestHeaders = {
          ...headers,
          ...getProxyHeaders(request),
          // There are a few internal calls that console UI makes to ES in order to get mappings, aliases and templates
          // in the autocomplete mechanism from the editor. At this particular time, those requests generate deprecation
          // logs since they access system indices. With this header we can provide a way to the UI to determine which
          // requests need to deprecation logs and which ones dont.
          ...(withProductOrigin && { 'x-elastic-product-origin': 'kibana' }),
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
            headers: {
              'x-console-proxy-status-code': '502',
              'x-console-proxy-status-text': 'Bad Gateway',
            },
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

    const isHeadRequest = method.toUpperCase() === 'HEAD';
    return response.ok({
      body: isHeadRequest ? `${statusCode} - ${statusMessage}` : esIncomingMessage!,
      headers: {
        warning: warning || '',
        // We need to set the status code and status text as headers so that the client can access them
        // in the response. This is needed because the client is using them to show the status of the request
        // in the UI. By sending them as headers we avoid logging out users if the status code is 403. E.g.
        // if the user is not authorized to access the cluster, we don't want to log them out. (See https://github.com/elastic/kibana/issues/140536)
        'x-console-proxy-status-code': String(statusCode) || '',
        'x-console-proxy-status-text': statusMessage || '',
        ...(isHeadRequest && { 'Content-Type': 'text/plain' }),
      },
    });
  };
