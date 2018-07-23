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

const searchStrategies = [];

const addSearchStrategy = searchStrategy => {
  if (searchStrategies.includes(searchStrategy)) {
    return;
  }

  searchStrategies.push(searchStrategy);
};

const getSearchStrategy = indexPattern => {
  return searchStrategies.find(searchStrategy => {
    return searchStrategy.isViable(indexPattern);
  });
};

/**
 * Build a structure like this:
 *
 *   [{
 *     searchStrategy: rollupSearchStrategy,
 *     searchRequests: []<SearchRequest>,
 *   }, {
 *     searchStrategy: defaultSearchStrategy,
 *     searchRequests: []<SearchRequest>,
 *   }]
 *
 * We use an array of objects to preserve the order of the search requests, which we use to
 * deterministically associate each response with the originating request.
 */
const assignSearchRequestsToSearchStrategies = searchRequests => {
  const searchStrategiesWithRequests = [];
  const searchStrategyById = {};

  searchRequests.forEach(searchRequest => {

    const indexPattern = searchRequest.source.getField('index');
    const matchingSearchStrategy = getSearchStrategy(indexPattern);

    const { id } = matchingSearchStrategy;
    let searchStrategyWithRequest = searchStrategyById[id];

    // Create the data structure if we don't already have it.
    if (!searchStrategyWithRequest) {
      searchStrategyWithRequest = {
        searchStrategy: matchingSearchStrategy,
        searchRequests: [],
      };

      searchStrategyById[id] = searchStrategyWithRequest;
      searchStrategiesWithRequests.push(searchStrategyWithRequest);
    }

    searchStrategyWithRequest.searchRequests.push(searchRequest);
  });

  return searchStrategiesWithRequests;
};

const hasSearchStategyForIndexPattern = indexPattern => {
  return Boolean(getSearchStrategy(indexPattern));
};

export {
  assignSearchRequestsToSearchStrategies,
  addSearchStrategy,
  hasSearchStategyForIndexPattern,
};
