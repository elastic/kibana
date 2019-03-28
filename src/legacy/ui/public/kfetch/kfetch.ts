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
import { metadata } from 'ui/metadata';
import url from 'url';
import chrome from '../chrome';
import { KFetchError } from './kfetch_error';

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

export interface KFetchOptions extends RequestInit {
  pathname?: string;
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

export async function kfetch(
  options: KFetchOptions,
  { prependBasePath = true }: KFetchKibanaOptions = {}
) {
  const combinedOptions = withDefaultOptions(options);
  const promise = requestInterceptors(combinedOptions).then(
    ({ pathname, query, ...restOptions }) => {
      const fullUrl = url.format({
        pathname: prependBasePath ? chrome.addBasePath(pathname) : pathname,
        query,
      });

      return window.fetch(fullUrl, restOptions).then(async res => {
        const body = await getBodyAsJson(res);
        if (res.ok) {
          return body;
        }
        throw new KFetchError(res, body);
      });
    }
  );

  return responseInterceptors(promise);
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

async function getBodyAsJson(res: Response) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

export function withDefaultOptions(options?: KFetchOptions): KFetchOptions {
  return merge(
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': metadata.version,
      },
    },
    options
  );
}
