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
import { TStrategyTypes } from './strategy_types';
import { DEFAULT_SEARCH_STRATEGY } from '../../common';
import { IRequestTypesMap, ISearchOptions, ISearchGeneric } from './i_search';

export interface SearchArgs<T extends TStrategyTypes = typeof DEFAULT_SEARCH_STRATEGY> {
  request: IRequestTypesMap[T];
  options?: ISearchOptions;
  strategy?: T;
}

export interface SearchCollector {
  id: string;
  search: ISearchGeneric;
  destroy: () => void;
}

export interface SearchCollections {
  [key: string]: SearchCollector;
}

export type SearchCollectorFactory = (id: string) => Promise<SearchCollector>;

export type SearchCollectorFactoryInner = (
  id: string,
  search: ISearchGeneric
) => Promise<SearchCollector>;

export const searchCollectorFactoryFn: SearchCollectorFactoryInner = (id, search) =>
  Promise.resolve({
    id,
    search,
    destroy: () => {},
  });

export const getSearchCollectorFactory = (
  searchCollections: SearchCollections,
  factory: SearchCollectorFactoryInner,
  search: ISearchGeneric
): SearchCollectorFactory => async (id: string) => {
  searchCollections[id] = await factory(id, search);
  return searchCollections[id];
};

export const getSearchWithCollector = (searchCollections: SearchCollections) => <
  T extends TStrategyTypes = typeof DEFAULT_SEARCH_STRATEGY
>(
  searchArgs: SearchArgs<T>,
  batchId: string
) => {
  if (searchCollections[batchId] === undefined) {
    throw new Error('No collector with that id exists');
  } else {
    return searchCollections[batchId].search(
      searchArgs.request,
      searchArgs.options,
      searchArgs.strategy
    );
  }
};
