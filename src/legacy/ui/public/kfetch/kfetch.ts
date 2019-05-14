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

import { merge } from 'lodash';
// @ts-ignore not really worth typing
import { KFetchError } from './kfetch_error';

import { HttpSetup } from '../../../../core/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { HttpRequestInit } from '../../../../core/public/http/types';

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

export interface KFetchOptions extends HttpRequestInit {
  pathname: string;
  query?: KFetchQuery;
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export interface Interceptor {
  request?: (config: KFetchOptions) => Promise<KFetchOptions> | KFetchOptions;
  requestError?: (e: any) => Promise<KFetchOptions> | KFetchOptions;
  response?: (res: any) => any;
  responseError?: (e: any) => any;
}

const interceptors: Interceptor[] = [];
export const resetInterceptors = () => (interceptors.length = 0);
export const addInterceptor = (interceptor: Interceptor) => interceptors.push(interceptor);

export function createKfetch(http: HttpSetup) {
  return function kfetch(
    options: KFetchOptions,
    { prependBasePath = true }: KFetchKibanaOptions = {}
  ) {
    return responseInterceptors(
      requestInterceptors(withDefaultOptions(options))
        .then(({ pathname, ...restOptions }) =>
          http.fetch(pathname, { ...restOptions, prependBasePath })
        )
        .catch(err => {
          throw new KFetchError(err.response || { statusText: err.message }, err.body);
        })
    );
  };
}

// Request/response interceptors are called in opposite orders.
// Request hooks start from the newest interceptor and end with the oldest.
function requestInterceptors(config: KFetchOptions): Promise<KFetchOptions> {
  return interceptors.reduceRight((acc, interceptor) => {
    return acc.then(interceptor.request, interceptor.requestError);
  }, Promise.resolve(config));
}

// Response hooks start from the oldest interceptor and end with the newest.
function responseInterceptors(responsePromise: Promise<any>) {
  return interceptors.reduce((acc, interceptor) => {
    return acc.then(interceptor.response, interceptor.responseError);
  }, responsePromise);
}

export function withDefaultOptions(options?: KFetchOptions): KFetchOptions {
  const withDefaults = merge(
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    options
  ) as KFetchOptions;

  if (
    options &&
    options.headers &&
    'Content-Type' in options.headers &&
    options.headers['Content-Type'] === undefined
  ) {
    // TS thinks headers could be undefined here, but that isn't possible because
    // of the merge above.
    // @ts-ignore
    withDefaults.headers['Content-Type'] = undefined;
  }

  return withDefaults;
}
