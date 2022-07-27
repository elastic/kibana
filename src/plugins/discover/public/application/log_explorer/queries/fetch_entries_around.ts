/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EsQuerySortValue,
  IEsSearchResponse,
  ISearchSource,
  QueryStart,
  SortDirection,
} from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
// import * as rt from 'io-ts';
import { forkJoin, Observable } from 'rxjs';
import { LogExplorerPosition, SortCriteria, SortCriterion } from '../types';
import { getCursorFromPosition, getPredecessorPosition } from '../utils/cursor';

export interface FetchEntriesAroundParameters {
  chunkSize: number;
  position: LogExplorerPosition;
  sorting: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesAround =
  ({
    dataView,
    query,
    searchSource,
  }: {
    dataView: DataView;
    query: QueryStart;
    searchSource: ISearchSource;
  }) =>
  ({
    chunkSize,
    position,
    sorting,
    timeRange,
  }: FetchEntriesAroundParameters): Observable<{
    beforeResponse: IEsSearchResponse;
    afterResponse: IEsSearchResponse;
  }> => {
    const normalizeSortCriteria = normalizeSortCriteriaForDataView(dataView);
    const timeRangeFilter = query.timefilter.timefilter.createFilter(dataView, timeRange);

    const commonSearchSource = searchSource
      .createCopy()
      .setField('filter', timeRangeFilter)
      .setField('size', chunkSize);

    // TODO: create and use point-in-time, not currently possible from client?
    const beforeResponse$ = commonSearchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(position))
      .setField('sort', normalizeSortCriteria(invertSortCriteria(sorting)))
      .fetch$();
    const afterResponse$ = commonSearchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(getPredecessorPosition(position)))
      .setField('sort', normalizeSortCriteria(sorting))
      .fetch$();

    return forkJoin({
      beforeResponse: beforeResponse$,
      afterResponse: afterResponse$,
    });
  };

const normalizeSortCriteriaForDataView =
  (dataView: DataView) =>
  (sortCriteria: SortCriteria): EsQuerySortValue[] =>
    sortCriteria.map(normalizeSortCriterionForDataView(dataView));

const normalizeSortCriterionForDataView =
  (dataView: DataView) =>
  ([fieldName, sortDirection]: SortCriterion): EsQuerySortValue => ({
    [fieldName]: {
      order: SortDirection[sortDirection],
      ...(fieldName === dataView.timeFieldName && dataView.isTimeNanosBased()
        ? { format: 'strict_date_optional_time_nanos', numeric_type: 'date_nanos' }
        : { format: 'strict_date_optional_time' }),
    },
  });

const invertSortCriteria = (sortCriteria: SortCriteria): SortCriteria =>
  sortCriteria.map(([fieldName, sortDirection]) => [
    fieldName,
    sortDirection === 'asc' ? 'desc' : 'asc',
  ]);
