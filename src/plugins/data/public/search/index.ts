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

export {
  ISearchSetup,
  ISearchStart,
  ISearchContext,
  TSearchStrategyProvider,
  ISearchStrategy,
} from './types';

export {
  ISearch,
  ISearchOptions,
  IRequestTypesMap,
  IResponseTypesMap,
  ISearchGeneric,
} from './i_search';

export { IEsSearchResponse, IEsSearchRequest, ES_SEARCH_STRATEGY } from '../../common/search';

export { SYNC_SEARCH_STRATEGY } from './sync_search_strategy';

export { IKibanaSearchResponse, IKibanaSearchRequest } from '../../common/search';

export { LegacyApiCaller, SearchRequest, SearchResponse } from './es_client';

export {
  addSearchStrategy,
  hasSearchStategyForIndexPattern,
  defaultSearchStrategy,
  SearchError,
  SearchStrategyProvider,
  getSearchErrorType,
} from './search_strategy';

export {
  ISearchSource,
  SearchSource,
  SearchSourceFields,
  EsQuerySortValue,
  SortDirection,
} from './search_source';

export { FetchOptions } from './fetch';
