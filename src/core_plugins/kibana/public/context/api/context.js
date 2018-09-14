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
// @ts-check


// @ts-ignore
import { SearchSourceProvider } from 'ui/courier';

import { reverseSortDirection } from './utils/sorting';

/**
 * @typedef {Object} SearchResult
 * @prop {{ total: number, hits: any[] }} hits
 * @prop {Object} aggregations
 */

/**
 * @typedef {Object} SearchSourceT
 * @prop {function(): Promise<SearchResult>} fetch
 * @prop {function(string, any): SearchSourceT} setField
 * @prop {function(any): SearchSourceT} setParent
 */

/**
 * @typedef {'asc' | 'desc'} SortDirection
 */

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// look from 1 day up to 10000 days into the past and future
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000].map((days) => days * DAY_MILLIS);

function fetchContextProvider(indexPatterns, Private) {
  /**
   * @type {{new(): SearchSourceT}}
   */
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
    const searchSource = await createSearchSource(indexPatternId, filters);
    const offsetSign = timeSortDirection === 'asc' ? 1 : -1;

    // ending with `null` opens the last interval
    const intervals = asPairs([...LOOKUP_OFFSETS.map(offset => timeValue + offset * offsetSign), null]);

    let successors = [];
    for (const [startTimeValue, endTimeValue] of intervals) {
      const remainingSize = size - successors.length;

      if (remainingSize <= 0) {
        break;
      }

      const [afterTimeValue, afterTieBreakerValue] = successors.length > 0
        ? successors[successors.length - 1].sort
        : [timeValue, tieBreakerValue];

      const hits = await fetchHitsInInterval(
        searchSource,
        timeField,
        timeSortDirection,
        startTimeValue,
        endTimeValue,
        afterTimeValue,
        tieBreakerField,
        tieBreakerSortDirection,
        afterTieBreakerValue,
        remainingSize
      );

      successors = [...successors, ...hits];
    }

    return successors;
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
    const searchSource = await createSearchSource(indexPatternId, filters);
    const offsetSign = timeSortDirection === 'desc' ? 1 : -1;

    // ending with `null` opens the last interval
    const intervals = asPairs([...LOOKUP_OFFSETS.map(offset => timeValue + offset * offsetSign), null]);

    let predecessors = [];
    for (const [startTimeValue, endTimeValue] of intervals) {
      const remainingSize = size - predecessors.length;

      if (remainingSize <= 0) {
        break;
      }

      const [afterTimeValue, afterTieBreakerValue] = predecessors.length > 0
        ? predecessors[0].sort
        : [timeValue, tieBreakerValue];

      const hits = await fetchHitsInInterval(
        searchSource,
        timeField,
        reverseSortDirection(timeSortDirection),
        startTimeValue,
        endTimeValue,
        afterTimeValue,
        tieBreakerField,
        reverseSortDirection(tieBreakerSortDirection),
        afterTieBreakerValue,
        remainingSize
      );

      predecessors = [...hits.slice().reverse(), ...predecessors];
    }

    return predecessors;
  }

  /**
   * @param {string} indexPatternId
   * @param {any[]} filters
   * @returns {Promise<Object>}
   */
  async function createSearchSource(indexPatternId, filters) {
    const indexPattern = await indexPatterns.get(indexPatternId);

    return new SearchSource()
      .setParent(false)
      .setField('index', indexPattern)
      .setField('filter', filters);
  }

  /**
   * Fetch the hits between `(afterTimeValue, tieBreakerValue)` and
   * `endTimeValue` from the `searchSource` using the given `timeField` and
   * `tieBreakerField` fields up to a maximum of `maxCount` documents. The
   * documents are sorted by `(timeField, tieBreakerField)` using the
   * respective `timeSortDirection` and `tieBreakerSortDirection`.
   *
   * The `searchSource` is assumed to have the appropriate index pattern
   * and filters set.
   *
   * @param {SearchSourceT} searchSource
   * @param {string} timeField
   * @param {SortDirection} timeSortDirection
   * @param {number} startTimeValue
   * @param {number | null} endTimeValue
   * @param {number} [afterTimeValue=startTimeValue]
   * @param {string} tieBreakerField
   * @param {SortDirection} tieBreakerSortDirection
   * @param {number} tieBreakerValue
   * @param {number} maxCount
   * @returns {Promise<object[]>}
   */
  async function fetchHitsInInterval(
    searchSource,
    timeField,
    timeSortDirection,
    startTimeValue,
    endTimeValue,
    afterTimeValue,
    tieBreakerField,
    tieBreakerSortDirection,
    tieBreakerValue,
    maxCount
  ) {
    const startRange = {
      [timeSortDirection === 'asc' ? 'gte' : 'lte']: startTimeValue,
    };
    const endRange = endTimeValue === null ? {} : {
      [timeSortDirection === 'asc' ? 'lte' : 'gte']: endTimeValue,
    };

    const response = await searchSource
      .setField('size', maxCount)
      .setField('query', {
        query: {
          constant_score: {
            filter: {
              range: {
                [timeField]: {
                  format: 'epoch_millis',
                  ...startRange,
                  ...endRange,
                }
              },
            },
          },
        },
        language: 'lucene'
      })
      .setField('searchAfter', [
        afterTimeValue !== null ? afterTimeValue : startTimeValue,
        tieBreakerValue,
      ])
      .setField('sort', [
        { [timeField]: timeSortDirection },
        { [tieBreakerField]: tieBreakerSortDirection },
      ])
      .setField('version', true)
      .fetch();

    return response.hits ? response.hits.hits : [];
  }
}

/**
 * Generate a sequence of pairs from the iterable that looks like
 * `[[x_0, x_1], [x_1, x_2], [x_2, x_3], ..., [x_(n-1), x_n]]`.
 *
 * @param {Iterable<any>} iterable
 * @returns {IterableIterator<(any[])>}
 */
function* asPairs(iterable) {
  let currentPair = [];
  for (const value of iterable) {
    currentPair = [...currentPair, value].slice(-2);
    if (currentPair.length === 2) {
      yield currentPair;
    }
  }
}

export {
  fetchContextProvider,
};
