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

import { Observable } from 'rxjs';
import { IKibanaSearchResponse, IKibanaSearchRequest } from '../common';
import { TClientSearchStrategyProvider, IClientSearchStrategy } from './i_setup_contract';
import { ISearchContext } from './i_search_context';

export * from '../common/types';

export type IKibanaClientSearchResponse = IKibanaSearchResponse;

export type IKibanaClientSearchRequest = IKibanaSearchRequest;

export type TSearch = <
  TRequest extends IKibanaClientSearchRequest,
  TResponse extends IKibanaSearchResponse
>(
  request: TRequest
) => Observable<TResponse>;

export interface ISearchDependenciesInternal {
  clientSearchStrategyProviders: Map<string, TClientSearchStrategyProvider<any, any>>;
  defaultClientSearchStrategy: string;
  context: ISearchContext;
}

export interface ISearchApi {
  getClientSearchStrategy: <
    TRequest extends IKibanaClientSearchRequest,
    TResponse extends IKibanaClientSearchResponse
  >(
    name?: string
  ) => IClientSearchStrategy<TRequest, TResponse>;

  search: <
    TRequest extends IKibanaClientSearchRequest,
    TResponse extends IKibanaClientSearchResponse
  >(
    request: TRequest,
    options: ISearchOptions
  ) => Observable<TResponse>;
}

export interface ISearchApiPure {
  getClientSearchStrategy: <
    TRequest extends IKibanaClientSearchRequest,
    TResponse extends IKibanaClientSearchResponse
  >(
    deps: ISearchDependenciesInternal
  ) => (strategy: string) => IClientSearchStrategy<TRequest, TResponse>;

  search: <
    TRequest extends IKibanaClientSearchRequest,
    TResponse extends IKibanaClientSearchResponse
  >(
    deps: ISearchDependenciesInternal & {
      getClientSearchStrategy: ISearchApi['getClientSearchStrategy'];
    }
  ) => (request: TRequest, options: ISearchOptions) => Observable<TResponse>;
}

export interface ISearchOptions {
  signal?: AbortSignal;
}
