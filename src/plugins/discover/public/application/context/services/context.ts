/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Filter } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { DataPublicPluginStart, ISearchSource } from '@kbn/data-plugin/public';
import { reverseSortDir, SortDirection } from '../utils/sorting';
import { convertIsoToMillis, extractNanos } from '../utils/date_conversion';
import { fetchHitsInInterval } from '../utils/fetch_hits_in_interval';
import { generateIntervals } from '../utils/generate_intervals';
import { getEsQuerySearchAfter } from '../utils/get_es_query_search_after';
import { getEsQuerySort } from '../utils/get_es_query_sort';
import { DataTableRecord } from '../../../types';

export enum SurrDocType {
  SUCCESSORS = 'successors',
  PREDECESSORS = 'predecessors',
}

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// look from 1 day up to 10000 days into the past and future
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000].map((days) => days * DAY_MILLIS);

/**
 * Fetch successor or predecessor documents of a given anchor document
 *
 * @param {SurrDocType} type - `successors` or `predecessors`
 * @param {DataView} dataView
 * @param {DataTableRecord} anchor - anchor record
 * @param {string} tieBreakerField - name of the tie breaker, the 2nd sort field
 * @param {SortDirection} sortDir - direction of sorting
 * @param {number} size - number of records to retrieve
 * @param {Filter[]} filters - to apply in the elastic query
 * @param {boolean} useNewFieldsApi
 * @returns {Promise<object[]>}
 */
export async function fetchSurroundingDocs(
  type: SurrDocType,
  dataView: DataView,
  anchor: DataTableRecord,
  tieBreakerField: string,
  sortDir: SortDirection,
  size: number,
  filters: Filter[],
  data: DataPublicPluginStart,
  useNewFieldsApi?: boolean
): Promise<DataTableRecord[]> {
  if (typeof anchor !== 'object' || anchor === null || !size) {
    return [];
  }
  const timeField = dataView.timeFieldName!;
  const searchSource = data.search.searchSource.createEmpty();
  updateSearchSource(searchSource, dataView, filters, Boolean(useNewFieldsApi));
  const sortDirToApply = type === SurrDocType.SUCCESSORS ? sortDir : reverseSortDir(sortDir);
  const anchorRaw = anchor.raw!;

  const nanos = dataView.isTimeNanosBased() ? extractNanos(anchorRaw.fields?.[timeField][0]) : '';
  const timeValueMillis =
    nanos !== '' ? convertIsoToMillis(anchorRaw.fields?.[timeField][0]) : anchorRaw.sort?.[0];

  const intervals = generateIntervals(LOOKUP_OFFSETS, timeValueMillis as number, type, sortDir);
  let documents: DataTableRecord[] = [];

  for (const interval of intervals) {
    const remainingSize = size - documents.length;

    if (remainingSize <= 0) {
      break;
    }

    const searchAfter = getEsQuerySearchAfter(
      type,
      documents,
      timeField,
      anchor,
      nanos,
      useNewFieldsApi
    );

    const sort = getEsQuerySort(timeField, tieBreakerField, sortDirToApply, nanos);

    const hits = await fetchHitsInInterval(
      searchSource,
      timeField,
      sort,
      sortDirToApply,
      interval,
      searchAfter,
      remainingSize,
      nanos,
      anchor.raw._id
    );

    documents =
      type === SurrDocType.SUCCESSORS
        ? [...documents, ...hits]
        : [...hits.slice().reverse(), ...documents];
  }

  return documents;
}

export function updateSearchSource(
  searchSource: ISearchSource,
  dataView: DataView,
  filters: Filter[],
  useNewFieldsApi: boolean
) {
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    searchSource.setField('fields', [{ field: '*', include_unmapped: 'true' }]);
  }
  return searchSource
    .setParent(undefined)
    .setField('index', dataView)
    .setField('filter', filters)
    .setField('trackTotalHits', false);
}
