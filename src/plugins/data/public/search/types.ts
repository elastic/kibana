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

import { CoreStart, SavedObjectReference } from 'kibana/public';
import { TimeRange } from '../../common';
import { ISearch, ISearchGeneric } from './i_search';
import { TStrategyTypes } from './strategy_types';
import { LegacyApiCaller } from './es_client';
import { ISearchSource } from './search_source';

export interface ISearchContext {
  core: CoreStart;
  getSearchStrategy: <T extends TStrategyTypes>(name: T) => TSearchStrategyProvider<T>;
}

/**
 * Search strategy interface contains a search method that takes in
 * a request and returns a promise that resolves to a response.
 */
export interface ISearchStrategy<T extends TStrategyTypes> {
  search: ISearch<T>;
}

/**
 * Search strategy provider creates an instance of a search strategy with the request
 * handler context bound to it. This way every search strategy can use
 * whatever information they require from the request context.
 */
export type TSearchStrategyProviderEnhanced<T extends TStrategyTypes> = (
  search: ISearchGeneric
) => Promise<ISearchStrategy<T>>;

export type TSearchStrategiesMap = {
  [K in TStrategyTypes]?: TSearchStrategyProvider<any>;
};

/**
 * Search strategy provider creates an instance of a search strategy with the request
 * handler context bound to it. This way every search strategy can use
 * whatever information they require from the request context.
 */
export type TSearchStrategyProvider<T extends TStrategyTypes> = (
  context: ISearchContext
) => ISearchStrategy<T>;

/**
 * Extension point exposed for other plugins to register their own search
 * strategies.
 */
export type TRegisterSearchStrategyProvider = <T extends TStrategyTypes>(
  name: T,
  searchStrategyProvider: TSearchStrategyProvider<T>
) => void;

interface SearchAggsSetup {
  calculateAutoTimeExpression: (range: TimeRange) => string | undefined;
}

interface SearchAggsStart {
  calculateAutoTimeExpression: (range: TimeRange) => string | undefined;
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
  registerSearchStrategyProvider: TRegisterSearchStrategyProvider;
}

export interface ISearchStart {
  aggs: SearchAggsStart;
  search: ISearchGeneric;
  /**
   * Serializes a `SearchSource` instance to a JSON string and a set of referenced objects.
   * Use this method to get a representation of the search source which can be stored in a saved object.
   *
   * The references returned by this function can be mixed with other references in the same object,
   * however make sure there are no name-collisions. The references will be named `kibanaSavedObjectMeta.searchSourceJSON.index`
   * and `kibanaSavedObjectMeta.searchSourceJSON.filter[<number>].meta.index`.
   *
   * Using `parseSearchSource`, the instance can be re-created.
   * @param searchSource The search source to serialize
   */
  serializeSearchSource: (
    searchSource: ISearchSource
  ) => { searchSourceJSON: string; references: SavedObjectReference[] };
  /**
   * Deserializes a json string and a set of referenced objects to a `SearchSource` instance.
   * Use this method to re-create the search source serialized using `serializeSearchSource`
   * @param searchSourceJson The json string returned by `serializeSearchSource`
   * @param references A list of references including the ones returned by `serializeSearchSource`
   */
  parseSearchSource: (
    searchSourceJson: string,
    references: SavedObjectReference[]
  ) => Promise<ISearchSource>;
  __LEGACY: {
    esClient: LegacyApiCaller;
  };
}
