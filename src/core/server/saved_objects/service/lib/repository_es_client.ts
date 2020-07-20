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
import type { RequestParams } from '@elastic/elasticsearch';

import type {
  ApiResponse,
  TransportRequestOptions,
  RequestNDBody,
  RequestBody,
} from '@elastic/elasticsearch/lib/Transport';

import { ElasticsearchClient } from '../../../elasticsearch/';
import { retryCallCluster } from '../../../elasticsearch/client/retry_call_cluster';
import { decorateEsError } from './decorate_es_error';

const methods: MethodName[] = [
  'bulk',
  'create',
  'delete',
  'get',
  'index',
  'mget',
  'search',
  'update',
  'updateByQuery',
];

// TODO use Pick when @elastic/elasticsearch provides Kibana specific types without overloading
export interface RepositoryEsClient {
  bulk<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.Bulk<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  create<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Create<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  get<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Get,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  delete<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Delete,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  index<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Index<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  mget<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Mget<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  search<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Search<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  update<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Update<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;

  updateByQuery<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.UpdateByQuery<TRequestBody>,
    options?: TransportRequestOptions
  ): Promise<ApiResponse<TResponse, TContext>>;
}

type MethodName = keyof RepositoryEsClient;

export function createRepositoryEsClient(client: ElasticsearchClient): RepositoryEsClient {
  return methods.reduce((acc: RepositoryEsClient, key: MethodName) => {
    acc[key] = async (params?: unknown, options?: TransportRequestOptions) => {
      try {
        return await retryCallCluster(() =>
          (client[key] as Function)(params, { maxRetries: 0, ...options })
        );
      } catch (e) {
        throw decorateEsError(e);
      }
    };
    return acc;
  }, {} as RepositoryEsClient);
}
