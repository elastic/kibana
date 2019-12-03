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

import { IndexPattern } from '../../../../core_plugins/data/public';
import { SearchStrategyProvider } from './types';
import { noOpSearchStrategy } from './no_op_search_strategy';
import { SearchResponse } from '../types';

export const searchStrategies: SearchStrategyProvider[] = [];

export const addSearchStrategy = (searchStrategy: SearchStrategyProvider) => {
  if (searchStrategies.includes(searchStrategy)) {
    return;
  }

  searchStrategies.push(searchStrategy);
};

export const getSearchStrategyByViability = (indexPattern: IndexPattern) => {
  return searchStrategies.find(searchStrategy => {
    return searchStrategy.isViable(indexPattern);
  });
};

export const getSearchStrategyById = (searchStrategyId: string) => {
  return [...searchStrategies, noOpSearchStrategy].find(searchStrategy => {
    return searchStrategy.id === searchStrategyId;
  });
};

export const getSearchStrategyForSearchRequest = (
  searchRequest: SearchResponse,
  { searchStrategyId }: { searchStrategyId?: string } = {}
) => {
  // Allow the searchSource to declare the correct strategy with which to execute its searches.
  if (searchStrategyId != null) {
    const strategy = getSearchStrategyById(searchStrategyId);
    if (!strategy) throw Error(`No strategy with ID ${searchStrategyId}`);
    return strategy;
  }

  // Otherwise try to match it to a strategy.
  const viableSearchStrategy = getSearchStrategyByViability(searchRequest.index);

  if (viableSearchStrategy) {
    return viableSearchStrategy;
  }

  // This search strategy automatically rejects with an error.
  return noOpSearchStrategy;
};

export const hasSearchStategyForIndexPattern = (indexPattern: IndexPattern) => {
  return Boolean(getSearchStrategyByViability(indexPattern));
};
