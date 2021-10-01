/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup, HttpFetchQuery } from '../../../../../src/core/public';

export type ResponseInterceptor = (response: any) => any;

export interface SendRequestConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  query?: HttpFetchQuery;
  body?: any;
  /**
   * If set, flags this as a "system request" to indicate that this is not a user-initiated request. For more information, see
   * HttpFetchOptions#asSystemRequest.
   */
  asSystemRequest?: boolean;
  errorInterceptors?: ResponseInterceptor[];
}

export interface SendRequestResponse<D = any, E = any> {
  data: D | null;
  error: E | null;
}

// Pass the response sequentially through each interceptor, providing
// the output of one interceptor as the input of the next interceptor.
const applyInterceptors = (response: any, interceptors: ResponseInterceptor[] = []): any => {
  return interceptors.reduce(
    (interceptedResponse, interceptor) => interceptor(interceptedResponse),
    response
  );
};

export const sendRequest = async <D = any, E = any>(
  httpClient: HttpSetup,
  { path, method, body, query, asSystemRequest, errorInterceptors }: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  try {
    const stringifiedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await httpClient[method](path, {
      body: stringifiedBody,
      query,
      asSystemRequest,
    });

    return {
      data: response.data ? response.data : response,
      error: null,
    };
  } catch (e) {
    const responseError = e.response?.data ?? e.body;
    const interceptedError = applyInterceptors(responseError, errorInterceptors);
    return {
      data: null,
      error: interceptedError,
    };
  }
};
