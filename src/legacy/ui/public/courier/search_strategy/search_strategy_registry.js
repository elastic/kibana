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

import { noOpSearchStrategy } from './no_op_search_strategy';

export const searchStrategies = [];

export const addSearchStrategy = searchStrategy => {
  if (searchStrategies.includes(searchStrategy)) {
    return;
  }

  searchStrategies.push(searchStrategy);
};

export const getSearchStrategyByViability = indexPattern => {
  return searchStrategies.find(searchStrategy => {
    return searchStrategy.isViable(indexPattern);
  });
};

export const getSearchStrategyById = searchStrategyId => {
  return searchStrategies.find(searchStrategy => {
    return searchStrategy.id === searchStrategyId;
  });
};

export const getSearchStrategyForSearchRequest = (searchRequest, { searchStrategyId } = {}) => {
  // Allow the searchSource to declare the correct strategy with which to execute its searches.
  if (searchStrategyId != null) {
    return getSearchStrategyById(searchStrategyId);
  }

  // Otherwise try to match it to a strategy.
  const viableSearchStrategy = getSearchStrategyByViability(searchRequest.index);

  if (viableSearchStrategy) {
    return viableSearchStrategy;
  }

  // This search strategy automatically rejects with an error.
  return noOpSearchStrategy;
};

export const hasSearchStategyForIndexPattern = indexPattern => {
  return Boolean(getSearchStrategyByViability(indexPattern));
};
