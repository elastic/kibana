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

import _ from 'lodash';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { reverseSortDirection } from './utils/sorting';

// look 1 day into the future/past initially
const INITIAL_LIMIT_INCREMENT = 24 * 60 * 60 * 1000;

function fetchContextProvider(courier, Private) {
  const SearchSource = Private(SearchSourceProvider);

  return {
    fetchPredecessors,
    fetchSuccessors,
  };

  async function fetchSuccessors(
    indexPatternId,
    sortingField,
    sortingDirection,
    sortingValue,
    tieBreakerField,
    tieBreakerDirection,
    tieBreakerValue,
    size,
    filters
  ) {
    const successorsSearchSource = await createSearchSource(
      indexPatternId,
      sortingField,
      sortingDirection,
      sortingValue,
      tieBreakerField,
      tieBreakerDirection,
      tieBreakerValue,
      size,
      filters,
    );
    const results = await performQuery(
      successorsSearchSource,
      sortingField,
      sortingDirection,
      sortingValue,
      sortingValue - INITIAL_LIMIT_INCREMENT,
      size,
      sortingValue * 2
    );
    return results;
  }

  async function fetchPredecessors(
    indexPatternId,
    sortingField,
    sortingDirection,
    sortingValue,
    tieBreakerField,
    tieBreakerDirection,
    tieBreakerValue,
    size,
    filters
  ) {
    const predecessorSortingDirection = reverseSortDirection(sortingDirection);
    const predecessorTieBreakerDirection = reverseSortDirection(tieBreakerDirection);
    const predecessorsSearchSource = await createSearchSource(
      indexPatternId,
      sortingField,
      predecessorSortingDirection,
      sortingValue,
      tieBreakerField,
      predecessorTieBreakerDirection,
      tieBreakerValue,
      size,
      filters,
    );
    const reversedResults = await performQuery(
      predecessorsSearchSource,
      sortingField,
      predecessorSortingDirection,
      sortingValue,
      sortingValue + INITIAL_LIMIT_INCREMENT,
      size,
      sortingValue * 2
    );
    const results = reversedResults.slice().reverse();
    return results;
  }

  async function createSearchSource(
    indexPatternId,
    sortingField,
    sortingDirection,
    sortingValue,
    tieBreakerField,
    tieBreakerDirection,
    tieBreakerValue,
    size,
    filters
  ) {
    const indexPattern = await courier.indexPatterns.get(indexPatternId);

    return new SearchSource()
      .inherits(false)
      .set('index', indexPattern)
      .set('version', true)
      .set('size', size)
      .set('filter', filters)
      .set('searchAfter', [sortingValue, tieBreakerValue])
      .set('sort', [
        { [sortingField]: sortingDirection },
        { [tieBreakerField]: tieBreakerDirection },
      ]);
  }

  async function performQuery(
    searchSource,
    sortingField,
    sortingDirection,
    fromSortingValue,
    toSortingValue,
    expectedSize,
    maxSortingValue
  ) {
    const response = await searchSource
      .set('query', {
        query: {
          constant_score: {
            filter: {
              // match_all: {},
              range: {
                [sortingField]: {
                  [sortingDirection === 'asc' ? 'gte' : 'lte']: fromSortingValue,
                  [sortingDirection === 'asc' ? 'lte' : 'gte']: toSortingValue,
                }
              },
            },
          },
        },
        language: 'lucene'
      })
      .fetchAsRejectablePromise();

    const hits = _.get(response, ['hits', 'hits'], []);
    const nextToSortingValue = toSortingValue + (toSortingValue - fromSortingValue);

    if (
      hits.length >= expectedSize ||
      nextToSortingValue > maxSortingValue ||
      nextToSortingValue < 0
    ) {
      return hits;
    } else {
      return await performQuery(
        searchSource,
        sortingField,
        sortingDirection,
        fromSortingValue,
        nextToSortingValue,
        expectedSize,
        maxSortingValue
      );
    }
  }
}


export {
  fetchContextProvider,
};
