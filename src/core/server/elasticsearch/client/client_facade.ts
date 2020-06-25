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

import { ApiResponse } from '@elastic/elasticsearch';
import {
  RequestBody,
  RequestNDBody,
  TransportRequestOptions,
  TransportRequestPromise,
} from '@elastic/elasticsearch/lib/Transport';
import * as RequestParams from '@elastic/elasticsearch/api/requestParams';

export interface ClientFacade {
  bulk<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.Bulk<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;

  asyncSearch: {
    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AsyncSearchDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AsyncSearchGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    submit<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.AsyncSearchSubmit<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
}
