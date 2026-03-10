/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Agent, IncomingMessage } from 'http';
import { pick } from 'lodash';

import type { KibanaRequest, RequestHandler } from '@kbn/core/server';

// TODO: find a better way to get information from the request like remoteAddress and remotePort
// for forwarding.
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import type { ESConfigForProxy } from '../../../../types';
import { getElasticsearchProxyConfig, proxyRequest, setHeaders } from '../../../../lib';

import type { RouteDependencies } from '../../..';

import type { Body, Query } from './validation_config';
import { toURL, stripCredentialsFromUrl } from '../../../../lib/utils';

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
  esConfig: ESConfigForProxy
): { agent: Agent; timeout: number; headers: object } {
  const filteredHeaders = filterHeaders(headers, esConfig.requestHeadersWhitelist);
  const newHeaders = setHeaders(filteredHeaders, esConfig.customHeaders);

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
    proxy: { readLegacyESConfig },
  }: RouteDependencies): RequestHandler<unknown, Query, Body> =>
  async (ctx, request, response) => {
    const { body, query } = request;
    const { method, path, withProductOrigin, host: requestHost } = query;

    const legacyConfig = await readLegacyESConfig();
    const { hosts } = legacyConfig;
    let esIncomingMessage: IncomingMessage;

    // Validate that the requested host is one of the configured Elasticsearch hosts.
    // The client receives URLs with credentials stripped, so we match by comparing
    // stripped versions to find the original configured host (which may contain
    // credentials needed for auth). Reject any host not in the allowlist to prevent SSRF.
    let host = hosts[0];
    if (requestHost) {
      // Normalize the incoming host the same way we normalize configured hosts
      // (e.g. adding trailing slash, dropping default ports) so that old values
      // stored in the client's localStorage still match after URL normalisation.
      const normalizedRequestHost = stripCredentialsFromUrl(requestHost);
      const match = hosts.find((h) => stripCredentialsFromUrl(h) === normalizedRequestHost);
      if (!match) {
        return response.badRequest({
          body: 'Host is not configured in elasticsearch.hosts',
        });
      }
      host = match;
    }
    try {
      const uri = toURL(host, path);

      // Because this can technically be provided by a settings-defined proxy config, we need to
      // preserve these property names to maintain BWC.
      const { timeout, agent, headers } = getRequestConfig(request.headers, legacyConfig);

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
        agent,
      });
    } catch (e) {
      log.error(e);
      log.warn(`Could not connect to ES node [${host}]`);

      const hasMultipleHosts = hosts.length > 1;
      const errorMessage =
        'Could not connect to Elasticsearch node. Try selecting a different host from Console > Config > General settings > Elasticsearch host.';

      return response.custom({
        statusCode: 502,
        body: {
          message: 'An internal server error occurred. Check Kibana server logs for details.',
        },
        headers: {
          'x-console-proxy-status-code': '502',
          'x-console-proxy-status-text': 'Bad Gateway',
          'content-type': 'application/json',
          ...(hasMultipleHosts && { warning: errorMessage }),
        },
      });
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
