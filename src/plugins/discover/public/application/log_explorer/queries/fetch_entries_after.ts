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
import { createUnsubscriptionAbortSignal } from '../hooks/use_observable';
import { LogExplorerPosition, SortCriteria } from '../types';
import { getCursorFromPosition, getPredecessorPosition } from '../utils/cursor';
import { normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { copyWithCommonParameters } from './common';

export interface FetchEntriesAfterParameters {
  afterStartPosition: LogExplorerPosition; // inclusive start of the "future" interval
  chunkSize: number;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
  sortCriteria: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesAfter =
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
    afterStartPosition,
    chunkSize,
    filters,
    query,
    sortCriteria,
    timeRange,
  }: FetchEntriesAfterParameters): Observable<IEsSearchResponse> => {
    const timeRangeFilter = timefilter.createFilter(dataView, timeRange);

    // TODO: create and use point-in-time, not currently possible from client?
    const fetchAfterSearchSource = pipe(
      copyWithCommonParameters({ size: chunkSize, filters, query, timeRangeFilter }),
      applyAfterParameters({
        dataView,
        afterStartPosition,
        sortCriteria,
      })
    )(searchSource);

    const { abortSignal, abortOnUnsubscribe } = createUnsubscriptionAbortSignal();
    const response$ = fetchAfterSearchSource
      .fetch$({
        abortSignal,
      })
      .pipe(abortOnUnsubscribe());

    return response$;
  };

export const applyAfterParameters =
  ({
    dataView,
    afterStartPosition,
    sortCriteria,
  }: {
    dataView: DataView;
    afterStartPosition: LogExplorerPosition;
    sortCriteria: SortCriteria;
  }) =>
  (searchSource: ISearchSource) =>
    searchSource
      .setField('searchAfter', getCursorFromPosition(getPredecessorPosition(afterStartPosition)))
      .setField('sort', normalizeSortCriteriaForDataView(dataView)(sortCriteria));
