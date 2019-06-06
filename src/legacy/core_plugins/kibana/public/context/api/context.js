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
import {
  extractNanoSeconds,
  convertIsoToNanosAsStr,
  convertIsoToMillis,
  convertTimeValueToIso
} from './utils/date_conversion';

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

/**
 * @typedef {'successors' |'predecessors'} SurroundingDocType
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
    // @ts-ignore / for testing
    fetchPredecessors: (...args) => fetchSurroundingDocs('predecessors', ...args),
    // @ts-ignore / for testing
    fetchSuccessors: (...args) => fetchSurroundingDocs('successors', ...args),
    fetchSurroundingDocs,
  };

  /**
   * Fetch successor or predecessor documents of a given anchor document
   *
   * @param {SurroundingDocType} type - `successors` or `predecessors`
   * @param {string} indexPatternId
   * @param {string} timeFieldName - name of the timefield, that's sorted on
   * @param {SortDirection} timeFieldSortDir - direction of sorting
   * @param {string} timeFieldIsoValue - value of the anchors timefield in ISO format
   * @param {number} timeFieldNumValue - value of the anchors timefield in numeric format (invalid for nanos)
   * @param {string} tieBreakerField - name of 2nd param for sorting
   * @param {string} tieBreakerValue - value of 2nd param for sorting
   * @param {number} size - number of records to retrieve
   * @param {any[]} filters - to apply in the elastic query
   * @returns {Promise<object[]>}
   */
  async function fetchSurroundingDocs(
    type,
    indexPatternId,
    timeFieldName,
    timeFieldSortDir,
    timeFieldIsoValue,
    timeFieldNumValue,
    tieBreakerField,
    tieBreakerValue,
    size,
    filters
  ) {
    const indexPattern = await indexPatterns.get(indexPatternId);
    const searchSource = await createSearchSource(indexPattern, filters);
    const sortDir = type === 'successors' ? timeFieldSortDir : reverseSortDirection(timeFieldSortDir);
    const nanoSeconds = indexPattern.isTimeNanosBased() ? extractNanoSeconds(timeFieldIsoValue) : '';
    const timeValueMillis = nanoSeconds !== '' ? convertIsoToMillis(timeFieldIsoValue) : timeFieldNumValue;

    const offsetSign = (timeFieldSortDir === 'asc' && type === 'successors' || timeFieldSortDir === 'desc' && type === 'predecessors')
      ? 1
      : -1;

    // ending with `null` opens the last interval
    const intervals = asPairs([...LOOKUP_OFFSETS.map(offset => timeValueMillis + offset * offsetSign), null]);

    let documents = [];
    for (const [iStartTimeValue, iEndTimeValue] of intervals) {
      const remainingSize = size - documents.length;

      if (remainingSize <= 0) {
        break;
      }
      const afterTimeRecIdx = type === 'successors' && documents.length ? documents.length - 1 : 0;
      const afterTimeValue = nanoSeconds
        ? convertIsoToNanosAsStr(documents.length ? documents[afterTimeRecIdx]._source[timeFieldName] : timeFieldIsoValue)
        : timeFieldNumValue;
      const afterTieBreakerValue = documents.length > 0 ? documents[afterTimeRecIdx].sort[1] : tieBreakerValue;

      const hits = await fetchHitsInInterval(
        searchSource,
        timeFieldName,
        sortDir,
        iStartTimeValue,
        iEndTimeValue,
        afterTimeValue,
        tieBreakerField,
        afterTieBreakerValue,
        remainingSize,
        nanoSeconds
      );

      documents = type === 'successors'
        ? [...documents, ...hits]
        : [...hits.slice().reverse(), ...documents];
    }

    return documents;
  }

  /**
   * @param {Object} indexPattern
   * @param {any[]} filters
   * @returns {Promise<Object>}
   */
  async function createSearchSource(indexPattern, filters) {
    return new SearchSource()
      .setParent(false)
      .setField('index', indexPattern)
      .setField('filter', filters);
  }

  /**
   * Fetch the hits between `(afterTimeValue, tieBreakerValue)` and
   * `endRangeMillis` from the `searchSource` using the given `timeField` and
   * `tieBreakerField` fields up to a maximum of `maxCount` documents. The
   * documents are sorted by `(timeField, tieBreakerField)` using the
   * `timeSortDirection` for both fields
   *
   * The `searchSource` is assumed to have the appropriate index pattern
   * and filters set.
   *
   * @param {SearchSourceT} searchSource
   * @param {string} timeFieldName
   * @param {SortDirection} timeFieldSortDir
   * @param {number} startRangeMillis
   * @param {number | null} endRangeMillis
   * @param {number| string} afterTimeValue
   * @param {string} tieBreakerField
   * @param {number} tieBreakerValue
   * @param {number} maxCount
   * @param {string} nanosValue
   * @returns {Promise<object[]>}
   */
  async function fetchHitsInInterval(
    searchSource,
    timeFieldName,
    timeFieldSortDir,
    startRangeMillis,
    endRangeMillis,
    afterTimeValue,
    tieBreakerField,
    tieBreakerValue,
    maxCount,
    nanosValue
  ) {

    const startRange = {
      [timeFieldSortDir === 'asc' ? 'gte' : 'lte']: convertTimeValueToIso(startRangeMillis, nanosValue),
    };
    const endRange = endRangeMillis === null ? {} : {
      [timeFieldSortDir === 'asc' ? 'lte' : 'gte']: convertTimeValueToIso(endRangeMillis, nanosValue),
    };

    const response = await searchSource
      .setField('size', maxCount)
      .setField('query', {
        query: {
          constant_score: {
            filter: {
              range: {
                [timeFieldName]: {
                  format: 'strict_date_optional_time',
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
        afterTimeValue,
        tieBreakerValue
      ])
      .setField('sort', [
        { [timeFieldName]: timeFieldSortDir },
        { [tieBreakerField]: timeFieldSortDir },
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
