/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, trimStart, trimEnd } from 'lodash';
import { KibanaRequest } from 'kibana/server';

// TODO: find a better way to get information from the request like remoteAddress and remotePort
// for forwarding.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '../../../../../../../core/server/http/router';

import { ESConfigForProxy } from '../../../../types';
import { getElasticsearchProxyConfig, ProxyConfigCollection, setHeaders } from '../../../../lib';
import { RouteDependencies } from '../../../';
import { routeValidationConfig } from './validation_config';
import { handleEsRequest } from './handle_es_request';
import { handleKibanaRequest } from './handle_kibana_request';

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

function getRequestConfigHeaders(
  headers: object,
  esConfig: ESConfigForProxy
): { agent: Agent; timeout: number; headers: object; rejectUnauthorized?: boolean } {
  const filteredHeaders = filterHeaders(headers, esConfig.requestHeadersWhitelist);
  return setHeaders(filteredHeaders, esConfig.customHeaders);
}

export const registerProxyRoute = ({
  router,
  log,
  proxy: { readLegacyESConfig, pathFilters, proxyConfigCollection },
}: RouteDependencies) => {
  router.post(
    {
      path: '/api/console/proxy',
      options: {
        tags: ['access:console'],
        body: {
          output: 'stream',
          parse: false,
        },
      },
      validate: routeValidationConfig,
    },
    async (ctx, request, response) => {
      const { body, query, headers } = request;
      const { path, method } = query;
      const proxyHeaders = getProxyHeaders(request);

      const legacyConfig = await readLegacyESConfig();
      const requestConfigHeaders = getRequestConfigHeaders(headers, legacyConfig);
      const requestHeaders = {
        ...requestConfigHeaders,
        ...proxyHeaders,
      };

      const KIBANA_API_KEYWORD = 'kbn:';
      const isKibanaApiRequest = path.indexOf(KIBANA_API_KEYWORD) === 0;
      if (isKibanaApiRequest) {
        const kibanaApiPath = path.split(KIBANA_API_KEYWORD)[1];
        return await handleKibanaRequest(
          method,
          kibanaApiPath,
          body,
          query,
          headers,
          proxyHeaders,
          response,
          log,
          requestHeaders
        );
      }

      return await handleEsRequest(
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
        proxyConfigCollection,
        requestHeaders
      );
    }
  );
};
