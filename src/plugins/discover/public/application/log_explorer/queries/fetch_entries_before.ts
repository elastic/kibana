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
import { Observable } from 'rxjs';
import { LogExplorerPosition, SortCriteria } from '../types';
import { getCursorFromPosition } from '../utils/cursor';
import { invertSortCriteria, normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { copyWithCommonParameters } from './common';

export interface FetchEntriesBeforeParameters {
  chunkSize: number;
  position: LogExplorerPosition;
  sorting: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesBefore =
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
  }: FetchEntriesBeforeParameters): Observable<IEsSearchResponse> => {
    const normalizeSortCriteria = normalizeSortCriteriaForDataView(dataView);
    const timeRangeFilter = query.timefilter.timefilter.createFilter(dataView, timeRange);

    // TODO: create and use point-in-time, not currently possible from client?
    const response$ = copyWithCommonParameters(searchSource, { chunkSize, timeRangeFilter })
      .setField('searchAfter', getCursorFromPosition(position))
      .setField('sort', normalizeSortCriteria(invertSortCriteria(sorting)))
      .fetch$();

    return response$;
  };
