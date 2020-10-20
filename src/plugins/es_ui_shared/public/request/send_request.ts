/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
