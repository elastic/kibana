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
import { IEsSearchRequest, IEsSearchResponse } from './es_search';

export type ISearchGeneric = <
  SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
>(
  request: SearchStrategyRequest,
  options?: ISearchOptions
) => Observable<SearchStrategyResponse>;

export type ISearchCancelGeneric = (id: string, options?: ISearchOptions) => Promise<void>;

export interface ISearchClient {
  search: ISearchGeneric;
  cancel: ISearchCancelGeneric;
}

export interface IKibanaSearchResponse<RawResponse = any> {
  /**
   * Some responses may contain a unique id to identify the request this response came from.
   */
  id?: string;

  /**
   * If relevant to the search strategy, return a total number
   * that represents how progress is indicated.
   */
  total?: number;

  /**
   * If relevant to the search strategy, return a loaded number
   * that represents how progress is indicated.
   */
  loaded?: number;

  /**
   * Indicates whether search is still in flight
   */
  isRunning?: boolean;

  /**
   * Indicates whether the results returned are complete or partial
   */
  isPartial?: boolean;

  /**
   * The raw response returned by the internal search method (usually the raw ES response)
   */
  rawResponse: RawResponse;
}

export interface IKibanaSearchRequest<Params = any> {
  /**
   * An id can be used to uniquely identify this request.
   */
  id?: string;

  params?: Params;
}

export interface ISearchOptions {
  /**
   * An `AbortSignal` that allows the caller of `search` to abort a search request.
   */
  abortSignal?: AbortSignal;
  /**
   * Use this option to force using a specific server side search strategy. Leave empty to use the default strategy.
   */
  strategy?: string;

  /**
   * A session ID, grouping multiple search requests into a single session.
   */
  sessionId?: string;
}
