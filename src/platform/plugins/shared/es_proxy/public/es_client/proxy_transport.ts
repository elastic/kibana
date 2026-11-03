/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestOptions, TransportRequestParams } from '@elastic/elasticsearch';
import type { HttpFetchQuery } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { EsProxyRequestParams, HttpMethod } from '../../common/types';

export type ProxyRequest = <T>(params: EsProxyRequestParams) => Promise<T>;

export interface ProxyTransport {
  request: (params: TransportRequestParams, options?: TransportRequestOptions) => Promise<unknown>;
}

type Querystring = TransportRequestParams['querystring'];
type RequestHeaders = TransportRequestOptions['headers'];

const HTTP_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'PUT', 'POST', 'DELETE']);
const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
const NOT_FOUND = 404;

const isHttpMethod = (method: string): method is HttpMethod => HTTP_METHODS.has(method);

/**
 * Splits the client's already-encoded path into decoded segments, which the proxy re-encodes.
 */
const toPathSegments = (path: string): string[] =>
  path
    .split('/')
    .filter((segment) => segment !== '')
    .map(decodeURIComponent);

const addQueryEntries = (query: HttpFetchQuery, querystring: Querystring): void => {
  if (querystring == null) {
    return;
  }
  const entries =
    typeof querystring === 'string'
      ? Array.from(new URLSearchParams(querystring).entries())
      : Object.entries(querystring);
  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }
    // Elasticsearch expects lists as comma-separated values, not repeated keys.
    query[key] = Array.isArray(value) ? value.join(',') : value;
  }
};

const toQuery = (...querystrings: Querystring[]): HttpFetchQuery => {
  const query: HttpFetchQuery = {};
  for (const querystring of querystrings) {
    addQueryEntries(query, querystring);
  }
  return query;
};

const isSerializable = (value: object): boolean =>
  !ArrayBuffer.isView(value) && !('pipe' in value) && !('getReader' in value);

export const toNdjson = (lines: readonly unknown[]): string =>
  lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n') + '\n';

const toBody = ({ body, bulkBody }: TransportRequestParams): string | object | undefined => {
  if (bulkBody != null) {
    if (typeof bulkBody === 'string') {
      return bulkBody;
    }
    if (Array.isArray(bulkBody)) {
      return toNdjson(bulkBody);
    }
  } else if (body == null || typeof body === 'string') {
    return body;
  } else if (isSerializable(body)) {
    return body;
  }
  throw new Error('The Elasticsearch proxy client only sends string and JSON bodies.');
};

const toHeaders = (headers: RequestHeaders, isNdjson: boolean): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (value === undefined) {
      continue;
    }
    // Kibana's fetch adds a default `Content-Type`; a differently cased name would be sent as a second value.
    const key = name.toLowerCase() === 'content-type' ? 'Content-Type' : name;
    result[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  if (isNdjson && !result['Content-Type']) {
    result['Content-Type'] = NDJSON_CONTENT_TYPE;
  }
  return result;
};

const getStatus = (error: unknown): number | undefined =>
  isHttpFetchError(error) ? error.response?.status : undefined;

/**
 * Creates an elasticsearch-js compatible transport that sends requests through the proxy. Responses
 * resolve with the parsed body and failed requests reject with Kibana's `HttpFetchError`.
 */
export const createProxyTransport = (proxyRequest: ProxyRequest): ProxyTransport => ({
  request: async (params, options = {}) => {
    const { method, path } = params;
    if (options.meta || options.asStream) {
      throw new Error(
        'The Elasticsearch proxy client does not support the `meta` or `asStream` options.'
      );
    }
    if (!isHttpMethod(method)) {
      throw new Error(`The Elasticsearch proxy does not support the ${method} method.`);
    }

    const body = toBody(params);
    try {
      const response = await proxyRequest({
        method,
        path: toPathSegments(path),
        query: toQuery(params.querystring, options.querystring),
        body,
        headers: toHeaders(options.headers, params.bulkBody != null),
        signal: options.signal,
      });
      return method === 'HEAD' ? true : response;
    } catch (error) {
      const status = getStatus(error);
      if (method === 'HEAD' && status === NOT_FOUND) {
        return false;
      }
      if (status !== undefined && options.ignore?.includes(status) && isHttpFetchError(error)) {
        return error.body;
      }
      throw error;
    }
  },
});
