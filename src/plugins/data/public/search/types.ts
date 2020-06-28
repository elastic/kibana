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
import { SearchAggsSetup, SearchAggsStart } from './aggs';
import { LegacyApiCaller } from './legacy/es_client';
import { SearchInterceptor } from './search_interceptor';
import { ISearchSource, SearchSourceFields } from './search_source';

import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../common/search';

export interface ISearchOptions {
  signal?: AbortSignal;
}

export type ISearch = (
  request: IKibanaSearchRequest,
  options?: ISearchOptions
) => Observable<IKibanaSearchResponse>;

// Service API types
export interface IStrategyOptions extends ISearchOptions {
  strategy?: string;
}

export type ISearchGeneric = (
  request: IEsSearchRequest,
  options?: IStrategyOptions
) => Observable<IEsSearchResponse>;

export interface ISearchStartLegacy {
  esClient: LegacyApiCaller;
}

/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  aggs: SearchAggsSetup;
}

export interface ISearchStart {
  aggs: SearchAggsStart;
  setInterceptor: (searchInterceptor: SearchInterceptor) => void;
  search: ISearchGeneric;
  searchSource: {
    create: (fields?: SearchSourceFields) => Promise<ISearchSource>;
    createEmpty: () => ISearchSource;
  };
  __LEGACY: ISearchStartLegacy;
}
