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
import { IContextProvider } from 'kibana/public';
import { IKibanaClientSearchRequest, IKibanaClientSearchResponse, ISearchOptions } from './types';
import { ISearchContext } from './i_search_context';

/**
 * Search strategy interface contains a search method that takes in
 * a request and returns a promise that resolves to a response.
 */
export interface IClientSearchStrategy<
  TRequest extends IKibanaClientSearchRequest,
  TResponse extends IKibanaClientSearchResponse<any>
> {
  search: (request: TRequest, options: ISearchOptions) => Observable<TResponse>;
}

/**
 * Search strategy provider creates an instance of a search strategy with the request
 * handler context bound to it. This way every search strategy can use
 * whatever information they require from the request context.
 */
export type TClientSearchStrategyProvider<
  TRequest extends IKibanaClientSearchRequest,
  TResponse extends IKibanaClientSearchResponse<any>
> = (context: ISearchContext) => IClientSearchStrategy<TRequest, TResponse>;

/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  registerSearchStrategyContext: <TContextName extends 'core' | 'search'>(
    pluginId: symbol,
    strategyName: TContextName,
    provider: IContextProvider<ISearchContext, TContextName, []>
  ) => void;

  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerClientSearchStrategyProvider: <
    TRequest extends IKibanaClientSearchRequest,
    TResponse extends IKibanaClientSearchResponse<any>
  >(
    opaqueId: symbol,
    name: string,
    searchStrategyProvider: TClientSearchStrategyProvider<TRequest, TResponse>
  ) => void;
}
