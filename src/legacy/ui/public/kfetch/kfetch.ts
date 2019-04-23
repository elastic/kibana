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

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

export interface KFetchOptions extends RequestInit {
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
    const controller = new AbortController();
    const promise = new Promise((resolve, reject) => {
      responseInterceptors(
        requestInterceptors(withDefaultOptions(options))
          .then(({ pathname, query, ...restOptions }) =>
            http.fetch(pathname, {
              ...restOptions,
              signal: controller.signal,
              query,
              prependBasePath,
            })
          )
          .catch(err => {
            throw new KFetchError(err.response || { statusText: err.message }, err.body);
          })
      ).then(resolve, reject);
    });

    return Object.assign(promise, {
      abort() {
        controller.abort();
        return promise;
      },
    });
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
  return merge(
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        ...(options && options.headers && options.headers.hasOwnProperty('Content-Type')
          ? {}
          : {
              'Content-Type': 'application/json',
            }),
      },
    },
    options
  );
}
