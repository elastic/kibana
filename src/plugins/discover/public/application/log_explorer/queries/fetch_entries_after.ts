/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { Observable, pipe } from 'rxjs';
import { LogExplorerPosition, SortCriteria } from '../types';
import { getCursorFromPosition, getPredecessorPosition } from '../utils/cursor';
import { normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { copyWithCommonParameters } from './common';

export interface FetchEntriesAfterParameters {
  chunkSize: number;
  // inclusive start of the "future" interval
  afterStartPosition: LogExplorerPosition;
  sortCriteria: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesAfter =
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
    afterStartPosition,
    sortCriteria,
    timeRange,
  }: FetchEntriesAfterParameters): Observable<IEsSearchResponse> => {
    const timeRangeFilter = query.timefilter.timefilter.createFilter(dataView, timeRange);

    // TODO: create and use point-in-time, not currently possible from client?
    const response$ = pipe(
      copyWithCommonParameters({ chunkSize, timeRangeFilter }),
      applyAfterParameters({
        dataView,
        afterStartPosition,
        sortCriteria,
      })
    )(searchSource).fetch$();

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
