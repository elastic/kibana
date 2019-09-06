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

import { IContextProvider, APICaller } from 'kibana/server';
import { IKibanaSearchResponse, IKibanaSearchRequest } from '../common';
import { ISearchStrategy } from './types';
import { ISearchContext } from './i_search_context';
import { ISearch } from './i_search';
/**
 * Search strategy interface contains a search method that takes in
 * a request and returns a promise that resolves to a response.
 */
export interface ISearchStrategy<
  TRequest extends IKibanaSearchRequest,
  TResponse extends IKibanaSearchResponse
> {
  search: (request: TRequest) => Promise<TResponse>;
}

/**
 * Search strategy provider creates an instance of a search strategy with the request
 * handler context bound to it. This way every search strategy can use
 * whatever information they require from the request context.
 */
export type TSearchStrategyProvider<
  TRequest extends IKibanaSearchRequest,
  TResponse extends IKibanaSearchResponse
> = (
  context: ISearchContext,
  caller: APICaller,
  search: ISearch
) => ISearchStrategy<TRequest, TResponse>;

/**
 * Search strategy provider creates an instance of a search strategy with the request
 * handler context bound to it. This way every search strategy can use
 * whatever information they require from the request context.
 */
export type TSearchStrategyProviderEnhanced<
  TRequest extends IKibanaSearchRequest,
  TResponse extends IKibanaSearchResponse
> = (caller: APICaller, search: ISearch) => Promise<ISearchStrategy<TRequest, TResponse>>;
/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  registerSearchStrategyContext: <TContextName extends keyof ISearchContext>(
    pluginId: symbol,
    strategyName: TContextName,
    provider: IContextProvider<ISearchContext, TContextName, []>
  ) => void;

  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategyProvider: <
    TRequest extends IKibanaSearchRequest,
    TResponse extends IKibanaSearchResponse
  >(
    opaqueId: symbol,
    name: string,
    searchStrategyProvider: TSearchStrategyProvider<TRequest, TResponse>
  ) => void;

  __LEGACY: {
    search: <TRequest extends IKibanaSearchRequest, TResponse extends IKibanaSearchResponse>(
      caller: APICaller,
      searchRequest: TRequest,
      strategyName: string
    ) => Promise<TResponse>;
  };
}
