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
import { AggsSetup, AggsStart } from './aggs';
import { SearchUsage } from './collectors/usage';
import { IEsSearchRequest, IEsSearchResponse } from './es_search';

export interface SearchEnhancements {
  defaultStrategy: string;
}

export interface ISearchOptions {
  /**
   * An `AbortSignal` that allows the caller of `search` to abort a search request.
   */
  signal?: AbortSignal;
  strategy?: string;
}

export interface ISearchSetup {
  aggs: AggsSetup;
  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategy: <
    SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
  >(
    name: string,
    strategy: ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>
  ) => void;

  /**
   * Used internally for telemetry
   */
  usage?: SearchUsage;

  /**
   * @internal
   */
  __enhance: (enhancements: SearchEnhancements) => void;
}

export interface ISearchStart<
  SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
> {
  aggs: AggsStart;
  /**
   * Get other registered search strategies. For example, if a new strategy needs to use the
   * already-registered ES search strategy, it can use this function to accomplish that.
   */
  getSearchStrategy: (
    name: string
  ) => ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>;
  search: (
    context: RequestHandlerContext,
    request: IKibanaSearchRequest,
    options: ISearchOptions
  ) => Promise<IKibanaSearchResponse>;
}

/**
 * Search strategy interface contains a search method that takes in a request and returns a promise
 * that resolves to a response.
 */
export interface ISearchStrategy<
  SearchStrategyRequest extends IEsSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IEsSearchResponse = IEsSearchResponse
> {
  search: (
    context: RequestHandlerContext,
    request: SearchStrategyRequest,
    options?: ISearchOptions
  ) => Promise<SearchStrategyResponse>;
  cancel?: (context: RequestHandlerContext, id: string) => Promise<void>;
}
