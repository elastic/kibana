/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Plugin,
  CoreSetup,
  CoreStart,
  HttpSetup,
  HttpFetchOptions,
  HttpFetchQuery,
  HttpHeadersInit,
} from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import { ES_PROXY_API_VERSION, ES_PROXY_ROUTE_PATH } from '../common';

export type HttpMethod = 'GET' | 'HEAD' | 'PUT' | 'POST' | 'DELETE';

export interface EsProxyRequestParams {
  method: HttpMethod;
  /**
   * Unencoded Elasticsearch path, e.g. `my-index/_search`; each `/`-separated segment is URI-encoded.
   * Pass an array of segments when a segment itself contains `/`, e.g. `['my-index', '_doc', 'a/b']`.
   */
  path: string | readonly string[];
  /** Objects are sent as JSON. Send ndjson as a string with `Content-Type: application/x-ndjson`. */
  body?: string | object;
  query?: HttpFetchQuery;
  headers?: HttpHeadersInit;
  signal?: AbortSignal;
}

export interface EsProxyPluginSetup {
  /** Sends a request and resolves with the parsed response body. */
  request: <T>(params: EsProxyRequestParams) => Promise<T>;
  /**
   * Sends a request and resolves with the unread `Response`, for streamed or binary output such as
   * server-sent events or `_query?format=arrow`.
   */
  stream: (params: EsProxyRequestParams) => Promise<Readonly<Response>>;
}

export type EsProxyPluginStart = EsProxyPluginSetup;

const toFetchArgs = ({
  method,
  path,
  body,
  query,
  headers,
  signal,
}: EsProxyRequestParams): [string, HttpFetchOptions] => [
  buildPath(ES_PROXY_ROUTE_PATH, {
    path: typeof path === 'string' ? path.replace(/^\/+/, '') : path,
  }),
  {
    method,
    query,
    headers,
    signal,
    version: ES_PROXY_API_VERSION,
    body: typeof body === 'object' ? JSON.stringify(body) : body,
  },
];

const createContract = (http: HttpSetup): EsProxyPluginSetup => ({
  request: <T>(params: EsProxyRequestParams) => http.fetch<T>(...toFetchArgs(params)),
  stream: async (params) => {
    const [path, options] = toFetchArgs(params);
    const { response } = await http.fetch(path, {
      ...options,
      asResponse: true,
      rawResponse: true,
    });
    if (!response) {
      throw new Error(`No response received for ${params.method} ${path}`);
    }
    return response;
  },
});

export class EsProxyPlugin implements Plugin<EsProxyPluginSetup, EsProxyPluginStart, {}, {}> {
  public setup({ http }: CoreSetup): EsProxyPluginSetup {
    return createContract(http);
  }

  public start({ http }: CoreStart): EsProxyPluginStart {
    return createContract(http);
  }

  public stop() {}
}
