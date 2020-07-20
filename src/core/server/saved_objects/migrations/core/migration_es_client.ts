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
  TransportRequestPromise,
  RequestNDBody,
  RequestBody,
} from '@elastic/elasticsearch/lib/Transport';
import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';

import { ElasticsearchClient } from '../../../elasticsearch';
import { migrationRetryCallCluster } from '../../../elasticsearch/client/retry_call_cluster';
import { Logger } from '../../../logging';

const methods = [
  'bulk',
  'cat.templates',
  'clearScroll',
  'count',
  'indices.create',
  'indices.delete',
  'indices.deleteTemplate',
  'indices.get',
  'indices.getAlias',
  'indices.refresh',
  'indices.updateAliases',
  'reindex',
  'search',
  'scroll',
  'tasks.get',
] as const;

type MethodName = typeof methods[number];

export interface MigrationEsClient {
  bulk<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.Bulk<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  cat: {
    templates<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatTemplates,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };

  clearScroll<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.ClearScroll<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  count<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.CatCount,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  indices: {
    create<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesCreate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    deleteTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDeleteTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    getAlias<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetAlias,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    refresh<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesRefresh,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

    updateAliases<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesUpdateAliases<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };

  reindex<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Reindex<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  search<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Search<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  scroll<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Scroll<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  tasks: {
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TasksGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
}

export function createMigrationEsClient(
  client: ElasticsearchClient,
  log: Logger,
  delay?: number
): MigrationEsClient {
  return methods.reduce((acc: MigrationEsClient, key: MethodName) => {
    set(acc, key, async (params?: unknown, options?: TransportRequestOptions) => {
      const fn = get(client, key);
      if (!fn) {
        throw new Error(`unknown ElasticsearchClient client method [${key}]`);
      }
      return await migrationRetryCallCluster(
        () => fn(params, { maxRetries: 0, ...options }),
        log,
        delay
      );
    });
    return acc;
  }, {} as MigrationEsClient);
}
