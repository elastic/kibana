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

import { SearchAggsSetup, SearchAggsStart } from './aggs';
import { ISearch, ISearchGeneric } from './i_search';
import { TStrategyTypes } from './strategy_types';
import { LegacyApiCaller } from './legacy/es_client';
import { SearchInterceptor } from './search_interceptor';
import { ISearchSource, SearchSourceFields } from './search_source';

/**
 * Search strategy interface contains a search method that takes in
 * a request and returns a promise that resolves to a response.
 */
export interface ISearchStrategy<T extends TStrategyTypes> {
  search: ISearch<T>;
}

export type TSearchStrategiesMap = {
  [K in TStrategyTypes]?: ISearchStrategy<any>;
};

/**
 * Extension point exposed for other plugins to register their own search
 * strategies.
 */
export type TRegisterSearchStrategy = <T extends TStrategyTypes>(
  name: T,
  searchStrategy: ISearchStrategy<T>
) => void;

/**
 * Used if a plugin needs access to an already registered search strategy.
 */
export type TGetSearchStrategy = <T extends TStrategyTypes>(name: T) => ISearchStrategy<T>;

export interface ISearchStartLegacy {
  esClient: LegacyApiCaller;
}

/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  aggs: SearchAggsSetup;
  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategy: TRegisterSearchStrategy;

  /**
   * Used if a plugin needs access to an already registered search strategy.
   */
  getSearchStrategy: TGetSearchStrategy;
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
