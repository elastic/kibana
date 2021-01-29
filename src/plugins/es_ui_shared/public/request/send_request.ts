/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpSetup, HttpFetchQuery } from '../../../../../src/core/public';

export interface SendRequestConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  query?: HttpFetchQuery;
  body?: any;
}

export interface SendRequestResponse<D = any, E = any> {
  data: D | null;
  error: E | null;
}

export const sendRequest = async <D = any, E = any>(
  httpClient: HttpSetup,
  { path, method, body, query }: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  try {
    const stringifiedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await httpClient[method](path, { body: stringifiedBody, query });

    return {
      data: response.data ? response.data : response,
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e.response?.data ?? e.body,
    };
  }
};
