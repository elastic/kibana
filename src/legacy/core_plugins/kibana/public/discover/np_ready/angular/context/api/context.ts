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

import { IndexPattern, SearchSource } from '../../../../kibana_services';
import { reverseSortDir, SortDirection } from './utils/sorting';
import { extractNanos, convertIsoToMillis } from './utils/date_conversion';
import { fetchHitsInInterval } from './utils/fetch_hits_in_interval';
import { generateIntervals } from './utils/generate_intervals';
import { getEsQuerySearchAfter } from './utils/get_es_query_search_after';
import { getEsQuerySort } from './utils/get_es_query_sort';
import { Filter, IndexPatternsContract } from '../../../../../../../../../plugins/data/public';

export type SurrDocType = 'successors' | 'predecessors';
export interface EsHitRecord {
  fields: Record<string, any>;
  sort: number[];
  _source: Record<string, any>;
}
export type EsHitRecordList = EsHitRecord[];

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// look from 1 day up to 10000 days into the past and future
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000].map(days => days * DAY_MILLIS);

function fetchContextProvider(indexPatterns: IndexPatternsContract) {
  return {
    fetchSurroundingDocs,
  };

  /**
   * Fetch successor or predecessor documents of a given anchor document
   *
   * @param {SurrDocType} type - `successors` or `predecessors`
   * @param {string} indexPatternId
   * @param {EsHitRecord} anchor - anchor record
   * @param {string} timeField - name of the timefield, that's sorted on
   * @param {string} tieBreakerField - name of the tie breaker, the 2nd sort field
   * @param {SortDirection} sortDir - direction of sorting
   * @param {number} size - number of records to retrieve
   * @param {Filter[]} filters - to apply in the elastic query
   * @returns {Promise<object[]>}
   */
  async function fetchSurroundingDocs(
    type: SurrDocType,
    indexPatternId: string,
    anchor: EsHitRecord,
    timeField: string,
    tieBreakerField: string,
    sortDir: SortDirection,
    size: number,
    filters: Filter[]
  ) {
    if (typeof anchor !== 'object' || anchor === null || !size) {
      return [];
    }
    const indexPattern = await indexPatterns.get(indexPatternId);
    const searchSource = await createSearchSource(indexPattern, filters);
    const sortDirToApply = type === 'successors' ? sortDir : reverseSortDir(sortDir);

    const nanos = indexPattern.isTimeNanosBased() ? extractNanos(anchor.fields[timeField][0]) : '';
    const timeValueMillis =
      nanos !== '' ? convertIsoToMillis(anchor.fields[timeField][0]) : anchor.sort[0];

    const intervals = generateIntervals(LOOKUP_OFFSETS, timeValueMillis, type, sortDir);
    let documents: EsHitRecordList = [];

    for (const interval of intervals) {
      const remainingSize = size - documents.length;

      if (remainingSize <= 0) {
        break;
      }

      const searchAfter = getEsQuerySearchAfter(type, documents, timeField, anchor, nanos);

      const sort = getEsQuerySort(timeField, tieBreakerField, sortDirToApply);

      const hits = await fetchHitsInInterval(
        searchSource,
        timeField,
        sort,
        sortDirToApply,
        interval,
        searchAfter,
        remainingSize,
        nanos
      );

      documents =
        type === 'successors' ? [...documents, ...hits] : [...hits.slice().reverse(), ...documents];
    }

    return documents;
  }

  async function createSearchSource(indexPattern: IndexPattern, filters: Filter[]) {
    return new SearchSource()
      .setParent(undefined)
      .setField('index', indexPattern)
      .setField('filter', filters);
  }
}

export { fetchContextProvider };
