/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingHttpHeaders } from 'http';
import { Readable } from 'stream';
import type { Stream } from 'stream';
import { errors } from '@elastic/elasticsearch';
import type { Headers, KibanaRequest, RequestHandler, ResponseHeaders } from '@kbn/core/server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { ES_PROXY_BASE_PATH } from '../../common';
import { getRequestAbortedSignal } from '../lib/get_request_aborted_signal';
import type { RouteDependencies } from '../types';

export interface ProxyParams {
  path?: string;
}

export type ProxyBody = Stream | undefined;

const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'content-encoding',
  'warning',
  'retry-after',
] as const;
const EVENT_STREAM_TYPE = 'text/event-stream';

export const ES_REQUEST_TIMEOUT_MS = 120_000;

const getHeader = (headers: Headers, name: string): string | undefined => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Builds the headers sent to Elasticsearch. Client headers are not forwarded wholesale: the scoped
 * client already adds the credentials, and headers like `cookie` or `host` must not reach Elasticsearch.
 */
export const getProxyHeaders = (request: KibanaRequest, hasBody: boolean): IncomingHttpHeaders => {
  const proxyHeaders: IncomingHttpHeaders = {
    'content-type': getHeader(request.headers, 'content-type') ?? 'application/json',
    // Clears the Kibana-origin default so Elasticsearch attributes deprecations to the user.
    'x-elastic-product-origin': '',
  };

  const accept = getHeader(request.headers, 'accept');
  if (accept) {
    proxyHeaders.accept = accept;
  }

  // Node's http client drops unframed GET/DELETE bodies, so streamed bodies are always chunked.
  if (hasBody) {
    proxyHeaders['transfer-encoding'] = 'chunked';
    // The body is forwarded still encoded (the route does not decompress it), so its encoding must travel with it.
    const contentEncoding = getHeader(request.headers, 'content-encoding');
    if (contentEncoding) {
      proxyHeaders['content-encoding'] = contentEncoding;
    }
  }

  const { info, server } = ensureRawRequest(request);
  if (info?.remoteAddress && info?.remotePort) {
    proxyHeaders['x-forwarded-for'] = info.remoteAddress;
    proxyHeaders['x-forwarded-port'] = String(info.remotePort);
    proxyHeaders['x-forwarded-proto'] = server.info.protocol;
    proxyHeaders['x-forwarded-host'] = info.host;
  }

  return proxyHeaders;
};

/**
 * Returns the Elasticsearch path for a proxy request, keeping percent-encoding intact
 * (hapi decodes route params, which would turn an encoded `%2F` into a path separator).
 */
export const getEsPath = (url: URL): string => {
  const esPath = url.pathname.slice(ES_PROXY_BASE_PATH.length);
  return esPath.startsWith('/') ? esPath : `/${esPath}`;
};

/**
 * Picks the Elasticsearch response headers returned to the client. `location` is relative to
 * Elasticsearch, so it is rewritten to point back through the proxy.
 */
export const getResponseHeaders = (
  esHeaders: IncomingHttpHeaders,
  proxyBasePath: string
): ResponseHeaders => {
  const headers: ResponseHeaders = {};
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = esHeaders[name];
    if (value) {
      headers[name] = value;
    }
  }
  const { location } = esHeaders;
  if (location?.startsWith('/')) {
    headers.location = `${proxyBasePath}${location}`;
  }
  // hapi skips compression when content-encoding is set; gzip would buffer server-sent events.
  if (!headers['content-encoding'] && esHeaders['content-type']?.startsWith(EVENT_STREAM_TYPE)) {
    headers['content-encoding'] = 'identity';
  }
  return headers;
};

export const createProxyHandler =
  ({ log, basePath }: RouteDependencies): RequestHandler<ProxyParams, unknown, ProxyBody> =>
  async (ctx, request, response) => {
    const method = request.route.method.toUpperCase();
    const body = request.body instanceof Readable ? request.body : undefined;
    const path = getEsPath(request.url);
    const proxyBasePath = `${basePath.get(request)}${ES_PROXY_BASE_PATH}`;
    const proxyHeaders = getProxyHeaders(request, body !== undefined);

    try {
      const { elasticsearch } = await ctx.core;
      const esResponse = await elasticsearch.client.asCurrentUser.transport.request<Readable>(
        {
          method,
          path,
          querystring: request.url.search.slice(1),
          body,
        },
        {
          asStream: true,
          meta: true,
          maxRetries: 0,
          requestTimeout: ES_REQUEST_TIMEOUT_MS,
          headers: proxyHeaders,
          // An already-encoded body must not be compressed a second time by the transport.
          ...(proxyHeaders['content-encoding'] ? { compression: false } : {}),
          signal: getRequestAbortedSignal(request.events.aborted$),
        }
      );

      return response.custom({
        statusCode: esResponse.statusCode ?? 200,
        body: esResponse.body,
        headers: getResponseHeaders(esResponse.headers ?? {}, proxyBasePath),
      });
    } catch (error) {
      if (error instanceof errors.ResponseError) {
        return response.custom({
          statusCode: error.statusCode ?? 500,
          body: error.body,
          headers: getResponseHeaders(error.headers ?? {}, proxyBasePath),
        });
      }
      if (error instanceof errors.TimeoutError) {
        log.warn(`Request to Elasticsearch timed out: ${method} ${path}`);
        return response.customError({
          statusCode: 504,
          body: { message: 'Elasticsearch did not respond in time.' },
        });
      }
      if (error instanceof errors.RequestAbortedError) {
        return response.customError({
          statusCode: 499,
          body: { message: 'Client closed request' },
        });
      }
      if (error instanceof errors.ConnectionError) {
        return response.customError({
          statusCode: 502,
          body: { message: `Unable to connect to Elasticsearch: ${error.message}` },
        });
      }
      throw error;
    }
  };
