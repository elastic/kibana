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
import { forkJoin, Observable } from 'rxjs';
import { LogExplorerPosition, SortCriteria } from '../types';
import { copyWithCommonParameters } from './common';
import { applyAfterParameters } from './fetch_entries_after';
import { applyBeforeParameters } from './fetch_entries_before';

export interface FetchEntriesAroundParameters {
  chunkSize: number;
  position: LogExplorerPosition;
  sortCriteria: SortCriteria;
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
    sortCriteria,
    timeRange,
  }: FetchEntriesAroundParameters): Observable<{
    beforeResponse: IEsSearchResponse;
    afterResponse: IEsSearchResponse;
  }> => {
    const timeRangeFilter = query.timefilter.timefilter.createFilter(dataView, timeRange);

    const commonSearchSource = copyWithCommonParameters({
      chunkSize,
      timeRangeFilter,
    })(searchSource);

    // TODO: create and use point-in-time, not currently possible from client?
    const beforeResponse$ = applyBeforeParameters({
      dataView,
      position,
      sortCriteria,
    })(commonSearchSource.createCopy()).fetch$();
    const afterResponse$ = applyAfterParameters({
      dataView,
      position,
      sortCriteria,
    })(commonSearchSource.createCopy()).fetch$();

    return forkJoin({
      beforeResponse: beforeResponse$,
      afterResponse: afterResponse$,
    });
  };
