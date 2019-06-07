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

// @ts-ignore
import { SearchSourceProvider, SearchSource } from 'ui/courier';
import { IPrivate } from 'ui/private';
import { IndexPattern, IndexPatterns } from 'ui/index_patterns/_index_pattern';
import { reverseSortDirection, SortDirection } from './utils/sorting';

import {
  extractNanoSeconds,
  convertIsoToNanosAsStr,
  convertIsoToMillis,
} from './utils/date_conversion';
import { fetchHitsInInterval } from './utils/fetch_hits_in_interval';
import { generateIntervals } from './utils/generate_intervals';

type SurroundingDocType = 'successors' | 'predecessors';
type EsHitRecord = Record<string, any>;
type EsHitRecordList = EsHitRecord[];

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// look from 1 day up to 10000 days into the past and future
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000].map(days => days * DAY_MILLIS);

function fetchContextProvider(indexPatterns: IndexPatterns, Private: IPrivate) {
  const SearchSourcePrivate: any = Private(SearchSourceProvider);

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
    type: SurroundingDocType,
    indexPatternId: string,
    timeFieldName: string,
    timeFieldSortDir: SortDirection,
    timeFieldIsoValue: string,
    timeFieldNumValue: number,
    tieBreakerField: string,
    tieBreakerValue: string,
    size: number,
    filters: any[]
  ) {
    const indexPattern = await indexPatterns.get(indexPatternId);
    const searchSource = await createSearchSource(indexPattern, filters);
    const sortDir =
      type === 'successors' ? timeFieldSortDir : reverseSortDirection(timeFieldSortDir);
    const nanoSeconds = indexPattern.isTimeNanosBased()
      ? extractNanoSeconds(timeFieldIsoValue)
      : '';
    const timeValueMillis =
      nanoSeconds !== '' ? convertIsoToMillis(timeFieldIsoValue) : timeFieldNumValue;

    const intervals = generateIntervals(LOOKUP_OFFSETS, timeValueMillis, type, timeFieldSortDir);

    let documents: EsHitRecordList = [];

    for (const [iStartTimeValue, iEndTimeValue] of intervals) {
      const remainingSize = size - documents.length;

      if (remainingSize <= 0) {
        break;
      }

      const searchAfter = getSearchAfter(
        type,
        documents,
        timeFieldName,
        timeFieldIsoValue,
        [timeFieldNumValue, tieBreakerValue],
        nanoSeconds
      );

      const sort = [{ [timeFieldName]: sortDir }, { [tieBreakerField]: sortDir }];

      const hits = await fetchHitsInInterval(
        searchSource,
        timeFieldName,
        sort,
        sortDir as SortDirection,
        iStartTimeValue,
        iEndTimeValue,
        searchAfter,
        remainingSize,
        nanoSeconds
      );

      documents =
        type === 'successors' ? [...documents, ...hits] : [...hits.slice().reverse(), ...documents];
    }

    return documents;
  }

  async function createSearchSource(indexPattern: IndexPattern, filters: any[]) {
    return new SearchSourcePrivate()
      .setParent(false)
      .setField('index', indexPattern)
      .setField('filter', filters);
  }
}

/**
 * Get the searchAfter value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
function getSearchAfter(
  type: SurroundingDocType,
  documents: EsHitRecordList,
  timeFieldName: string,
  anchorTimeIsoValue: string,
  anchorSearchAfter: [number | string, string],
  nanoSeconds: string
): [string | number, string | number] {
  if (documents.length) {
    const afterTimeRecIdx = type === 'successors' && documents.length ? documents.length - 1 : 0;
    const afterTimeDoc = documents[afterTimeRecIdx];

    const afterTimeValue = nanoSeconds
      ? convertIsoToNanosAsStr(afterTimeDoc._source[timeFieldName])
      : afterTimeDoc.sort[0];

    const afterTieBreakerValue = afterTimeDoc.sort[1];
    return [afterTimeValue, afterTieBreakerValue];
  } else {
    if (nanoSeconds) {
      // adapt timestamp value for sorting, since numeric value was rounded by browser
      // ES search_after also works when number is provided as string
      anchorSearchAfter[0] = convertIsoToNanosAsStr(anchorTimeIsoValue);
    }
    return anchorSearchAfter;
  }
}

export { fetchContextProvider };
