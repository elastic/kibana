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

import { RequestHandlerContext } from '../../../../core/server';
import { IKibanaSearchResponse, IKibanaSearchRequest } from '../../common/search';
import { ES_SEARCH_STRATEGY, IEsSearchRequest, IEsSearchResponse } from './es_search';

export interface ISearchSetup {
  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategy: TRegisterSearchStrategy;
}

export interface ISearchStart {
  /**
   * Get other registered search strategies. For example, if a new strategy needs to use the
   * already-registered ES search strategy, it can use this function to accomplish that.
   */
  getSearchStrategy: TGetSearchStrategy;
}

export interface ISearchOptions {
  /**
   * An `AbortSignal` that allows the caller of `search` to abort a search request.
   */
  signal?: AbortSignal;
}

/**
 * Contains all known strategy type identifiers that will be used to map to
 * request and response shapes. Plugins that wish to add their own custom search
 * strategies should extend this type via:
 *
 * const MY_STRATEGY = 'MY_STRATEGY';
 *
 * declare module 'src/plugins/search/server' {
 *  export interface IRequestTypesMap {
 *    [MY_STRATEGY]: IMySearchRequest;
 *  }
 *
 *  export interface IResponseTypesMap {
 *   [MY_STRATEGY]: IMySearchResponse
 *  }
 * }
 */
export type TStrategyTypes = typeof ES_SEARCH_STRATEGY | string;

/**
 * The map of search strategy IDs to the corresponding request type definitions.
 */
export interface IRequestTypesMap {
  [ES_SEARCH_STRATEGY]: IEsSearchRequest;
  [key: string]: IKibanaSearchRequest;
}

/**
 * The map of search strategy IDs to the corresponding response type definitions.
 */
export interface IResponseTypesMap {
  [ES_SEARCH_STRATEGY]: IEsSearchResponse;
  [key: string]: IKibanaSearchResponse;
}

export type ISearch<T extends TStrategyTypes> = (
  context: RequestHandlerContext,
  request: IRequestTypesMap[T],
  options?: ISearchOptions
) => Promise<IResponseTypesMap[T]>;

export type ISearchCancel<T extends TStrategyTypes> = (
  context: RequestHandlerContext,
  id: string
) => Promise<void>;

/**
 * Search strategy interface contains a search method that takes in a request and returns a promise
 * that resolves to a response.
 */
export interface ISearchStrategy<T extends TStrategyTypes> {
  search: ISearch<T>;
  cancel?: ISearchCancel<T>;
}

export type TRegisterSearchStrategy = <T extends TStrategyTypes>(
  name: T,
  searchStrategy: ISearchStrategy<T>
) => void;

export type TGetSearchStrategy = <T extends TStrategyTypes>(name: T) => ISearchStrategy<T>;

export type TSearchStrategiesMap = {
  [K in TStrategyTypes]?: ISearchStrategy<any>;
};
