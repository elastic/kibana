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

import { IKibanaSearchResponse, IKibanaSearchRequest } from '../../common/search';
import { TStrategyTypes } from './strategy_types';
import { ES_SEARCH_STRATEGY, IEsSearchResponse } from '../../common/search/es_search';
import { IEsSearchRequest } from './es_search';

export interface ISearchOptions {
  signal?: AbortSignal;
}

export interface IRequestTypesMap {
  [ES_SEARCH_STRATEGY]: IEsSearchRequest;
  [key: string]: IKibanaSearchRequest;
}

export interface IResponseTypesMap {
  [ES_SEARCH_STRATEGY]: IEsSearchResponse;
  [key: string]: IKibanaSearchResponse;
}

export type ISearchGeneric = <T extends TStrategyTypes = typeof ES_SEARCH_STRATEGY>(
  request: IRequestTypesMap[T],
  options?: ISearchOptions,
  strategy?: T
) => Promise<IResponseTypesMap[T]>;

export type ISearch<T extends TStrategyTypes> = (
  request: IRequestTypesMap[T],
  options?: ISearchOptions
) => Promise<IResponseTypesMap[T]>;
