/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup, HttpFetchQuery } from '../../../../../src/core/public';

export type ResponseHandler = ({ data, error }: { data: any; error: any }) => void;

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
  /**
   * Optional handlers for triggering side effects based on a request's
   * successful response or errror. These don't mutate responses or errors.
   */
  responseHandlers?: ResponseHandler[];
}

export interface SendRequestResponse<D = any, E = any> {
  data: D | null;
  error: E | null;
}

// Pass the response sequentially through each interceptor, allowing for
// side effects to be run.
const updateResponseHandlers = (response: any, responseHandlers: ResponseHandler[] = []) => {
  responseHandlers.forEach((interceptor) => interceptor(response));
};

export const sendRequest = async <D = any, E = any>(
  httpClient: HttpSetup,
  { path, method, body, query, asSystemRequest, responseHandlers }: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  try {
    const stringifiedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const rawResponse = await httpClient[method](path, {
      body: stringifiedBody,
      query,
      asSystemRequest,
    });

    const response = {
      data: rawResponse.data ? rawResponse.data : rawResponse,
      error: null,
    };

    updateResponseHandlers(response, responseHandlers);
    return response;
  } catch (e) {
    const response = {
      data: null,
      error: e.response?.data ?? e.body,
    };

    updateResponseHandlers(response, responseHandlers);
    return response;
  }
};
