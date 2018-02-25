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
    timeField,
    timeSortDirection,
    timeValue,
    tieBreakerField,
    tieBreakerSortDirection,
    tieBreakerValue,
    size,
    filters
  ) {
    const successorsSearchSource = await createSearchSource(
      indexPatternId,
      timeField,
      timeSortDirection,
      timeValue,
      tieBreakerField,
      tieBreakerSortDirection,
      tieBreakerValue,
      size,
      filters,
    );
    const results = await performQuery(
      successorsSearchSource,
      timeField,
      timeSortDirection,
      timeValue,
      timeValue - INITIAL_LIMIT_INCREMENT,
      size,
      timeValue * 2
    );
    return results;
  }

  async function fetchPredecessors(
    indexPatternId,
    timeField,
    timeSortDirection,
    timeValue,
    tieBreakerField,
    tieBreakerSortDirection,
    tieBreakerValue,
    size,
    filters
  ) {
    const predecessorTimeSortDirection =
      reverseSortDirection(timeSortDirection);
    const predecessorTieBreakerSortDirection =
      reverseSortDirection(tieBreakerSortDirection);
    const predecessorsSearchSource = await createSearchSource(
      indexPatternId,
      timeField,
      predecessorTimeSortDirection,
      timeValue,
      tieBreakerField,
      predecessorTieBreakerSortDirection,
      tieBreakerValue,
      size,
      filters,
    );
    const reversedResults = await performQuery(
      predecessorsSearchSource,
      timeField,
      predecessorTimeSortDirection,
      timeValue,
      timeValue + INITIAL_LIMIT_INCREMENT,
      size,
      timeValue * 2
    );
    const results = reversedResults.slice().reverse();
    return results;
  }

  async function createSearchSource(
    indexPatternId,
    timeField,
    timeSortDirection,
    timeValue,
    tieBreakerField,
    tieBreakerSortDirection,
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
      .set('searchAfter', [timeValue, tieBreakerValue])
      .set('sort', [
        { [timeField]: timeSortDirection },
        { [tieBreakerField]: tieBreakerSortDirection },
      ]);
  }

  async function performQuery(
    searchSource,
    timeField,
    timeSortDirection,
    fromTimeValue,
    toTimeValue,
    expectedSize,
    maxTimeValue = null
  ) {
    const response = await searchSource
      .set('query', {
        query: {
          constant_score: {
            filter: {
              // match_all: {},
              range: {
                [timeField]: {
                  [timeSortDirection === 'asc' ? 'gte' : 'lte']: fromTimeValue,
                  [timeSortDirection === 'asc' ? 'lte' : 'gte']: toTimeValue,
                }
              },
            },
          },
        },
        language: 'lucene'
      })
      .fetchAsRejectablePromise();

    const hits = _.get(response, ['hits', 'hits'], []);
    const nextToTimeValue = toTimeValue + (toTimeValue - fromTimeValue);

    if (
      hits.length >= expectedSize ||
      nextToTimeValue > maxTimeValue ||
      nextToTimeValue < 0
    ) {
      return hits;
    } else {
      return await performQuery(
        searchSource,
        timeField,
        timeSortDirection,
        fromTimeValue,
        nextToTimeValue,
        expectedSize,
        maxTimeValue
      );
    }
  }
}


export {
  fetchContextProvider,
};
