/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Observable, pipe } from 'rxjs';
import { LogExplorerPosition, SortCriteria } from '../types';
import { getCursorFromPosition, getSuccessorPosition } from '../utils/cursor';
import { invertSortCriteria, normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { copyWithCommonParameters } from './common';

export interface FetchEntriesBeforeParameters {
  beforeEndPosition: LogExplorerPosition; // inclusive end of the "past" interval
  chunkSize: number;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  sortCriteria: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesBefore =
  ({
    dataView,
    query: {
      timefilter: { timefilter },
    },
    searchSource,
  }: {
    dataView: DataView;
    query: QueryStart;
    searchSource: ISearchSource;
  }) =>
  ({
    beforeEndPosition,
    chunkSize,
    filters,
    query,
    sortCriteria,
    timeRange,
  }: FetchEntriesBeforeParameters): Observable<IEsSearchResponse> => {
    const timeRangeFilter = timefilter.createFilter(dataView, timeRange);

    // TODO: create and use point-in-time, not currently possible from client?
    const response$ = pipe(
      copyWithCommonParameters({ chunkSize, filters, query, timeRangeFilter }),
      applyBeforeParameters({ dataView, beforeEndPosition, sortCriteria })
    )(searchSource).fetch$();

    return response$;
  };

export const applyBeforeParameters =
  ({
    dataView,
    beforeEndPosition,
    sortCriteria,
  }: {
    dataView: DataView;
    beforeEndPosition: LogExplorerPosition;
    sortCriteria: SortCriteria;
  }) =>
  (searchSource: ISearchSource) =>
    searchSource
      .setField('searchAfter', getCursorFromPosition(getSuccessorPosition(beforeEndPosition)))
      .setField(
        'sort',
        normalizeSortCriteriaForDataView(dataView)(invertSortCriteria(sortCriteria))
      );
