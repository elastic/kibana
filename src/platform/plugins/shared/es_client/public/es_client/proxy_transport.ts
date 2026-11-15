/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  TransportRequestOptions,
  TransportRequestOptionsWithMeta,
  TransportRequestParams,
} from '@elastic/elasticsearch';
import type { HttpFetchQuery, HttpHeadersInit, HttpResponse } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { PRODUCT_ORIGIN_HEADER } from '../../common';
import type { EsClientResult, EsClientTransport, TransportRequestOptionsAsStream } from './types';

type HttpMethod = 'GET' | 'HEAD' | 'PUT' | 'POST' | 'DELETE';

export interface EsClientRequestParams {
  method: HttpMethod;
  /** The Elasticsearch path, already URI-encoded by the elasticsearch-js API, e.g. `/my-index/_doc/a%2Fb`. */
  path: string;
  /** Objects are sent as JSON. */
  body?: string | object;
  query?: HttpFetchQuery;
  headers?: HttpHeadersInit;
  signal?: AbortSignal;
}

/** Sends a request through the proxy. `rawResponse` leaves the response body unread. */
export type ProxyFetch = (
  params: EsClientRequestParams,
  rawResponse: boolean
) => Promise<HttpResponse>;

type Querystring = TransportRequestParams['querystring'];
type RequestHeaders = TransportRequestOptions['headers'];
type RequestMeta = EsClientResult['meta']['request'];

const HTTP_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'PUT', 'POST', 'DELETE']);
const NDJSON_CONTENT_TYPE = 'application/x-ndjson';
const NOT_FOUND = 404;
const KIBANA_PRODUCT_ORIGIN = 'kibana';
// One `Warning` header entry: code, agent, quoted text and an optional quoted date. Browsers join
// repeated headers with ", ", and the quoted text can itself contain commas.
const WARNING_ENTRY = /\d{3} \S+ "(?:[^"\\]|\\.)*"(?: "[^"]*")?/g;
const ELASTICSEARCH_WARNING = /^\d\d\d Elasticsearch-/;

// Browsers resolve these segments, even percent-encoded, so the request would reach another path.
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

const isHttpMethod = (method: string): method is HttpMethod => HTTP_METHODS.has(method);

const hasDotSegment = (path: string): boolean =>
  path.split('/').some((segment) => DOT_SEGMENT.test(segment));

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

const toQuerystring = (query: HttpFetchQuery): string =>
  Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

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

// Headers with a default value; a differently cased name would be sent as a second value.
const CANONICAL_HEADER_NAMES: Readonly<Record<string, string>> = {
  'content-type': 'Content-Type',
  [PRODUCT_ORIGIN_HEADER]: PRODUCT_ORIGIN_HEADER,
};

const toHeaders = (headers: RequestHeaders, isNdjson: boolean): Record<string, string> => {
  const result: Record<string, string> = { [PRODUCT_ORIGIN_HEADER]: KIBANA_PRODUCT_ORIGIN };
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (value === undefined) {
      continue;
    }
    const key = CANONICAL_HEADER_NAMES[name.toLowerCase()] ?? name;
    result[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  if (isNdjson && !result['Content-Type']) {
    result['Content-Type'] = NDJSON_CONTENT_TYPE;
  }
  return result;
};

const toResponseHeaders = (response: Response): Record<string, string> => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name] = value;
  });
  return headers;
};

const toWarnings = (response: Response): string[] | null => {
  const warning = response.headers.get('warning');
  if (warning == null) {
    return null;
  }
  return (warning.match(WARNING_ENTRY) ?? []).filter((entry) => ELASTICSEARCH_WARNING.test(entry));
};

const toResult = <TBody>(
  response: Response,
  body: TBody,
  request: RequestMeta
): EsClientResult<TBody> => ({
  body,
  statusCode: response.status,
  headers: toResponseHeaders(response),
  warnings: toWarnings(response),
  meta: { request, aborted: false },
});

/** Reads the body of an ignored error response that was fetched without being read. */
const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

/**
 * Creates an elasticsearch-js compatible transport that sends requests through the proxy. Failed
 * requests reject with Kibana's `HttpFetchError`.
 */
export const createProxyTransport = (proxyFetch: ProxyFetch): EsClientTransport => {
  function request(
    params: TransportRequestParams,
    options: TransportRequestOptionsAsStream & TransportRequestOptionsWithMeta
  ): Promise<EsClientResult<ReadableStream<Uint8Array> | null>>;
  function request(
    params: TransportRequestParams,
    options: TransportRequestOptionsAsStream
  ): Promise<ReadableStream<Uint8Array> | null>;
  function request<TResponse = unknown>(
    params: TransportRequestParams,
    options: TransportRequestOptionsWithMeta
  ): Promise<EsClientResult<TResponse>>;
  function request<TResponse = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptions
  ): Promise<TResponse>;
  async function request(
    params: TransportRequestParams,
    options: TransportRequestOptions = {}
  ): Promise<unknown> {
    const { method, path } = params;
    if (!isHttpMethod(method)) {
      throw new Error(`The Elasticsearch proxy does not support the ${method} method.`);
    }
    if (hasDotSegment(path)) {
      throw new Error(
        `The Elasticsearch proxy cannot send ${path}: "." and ".." path segments are not supported.`
      );
    }

    const asStream = options.asStream === true;
    // HEAD responses keep GET's JSON content type with no body, which `http.fetch` fails to parse.
    const rawResponse = asStream || method === 'HEAD';
    const body = toBody(params);
    const query = toQuery(params.querystring, options.querystring);
    const headers = toHeaders(options.headers, params.bulkBody != null);
    const requestMeta: RequestMeta = {
      params: {
        method,
        path,
        querystring: toQuerystring(query),
        headers,
        body: typeof body === 'object' ? JSON.stringify(body) : body,
      },
      options,
      id: null,
    };
    const respond = (result: EsClientResult): unknown => (options.meta ? result : result.body);

    let httpResponse: HttpResponse;
    try {
      httpResponse = await proxyFetch(
        { method, path, query, body, headers, signal: options.signal },
        rawResponse
      );
    } catch (error) {
      if (!isHttpFetchError(error) || !error.response) {
        throw error;
      }
      const { response } = error;
      if (method === 'HEAD' && response.status === NOT_FOUND) {
        return respond(toResult(response, false, requestMeta));
      }
      if (!options.ignore?.includes(response.status)) {
        throw error;
      }
      const errorBody = rawResponse ? await readBody(response) : error.body;
      return respond(toResult(response, errorBody, requestMeta));
    }

    const { response } = httpResponse;
    if (!response) {
      throw new Error(`No response received for ${method} ${path}`);
    }
    if (method === 'HEAD') {
      return respond(toResult(response, true, requestMeta));
    }
    return respond(toResult(response, asStream ? response.body : httpResponse.body, requestMeta));
  }

  return { request };
};
