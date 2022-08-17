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
import { forkJoin, Observable } from 'rxjs';
import { createUnsubscriptionAbortSignal } from '../hooks/use_observable';
import { LogExplorerPosition, SortCriteria } from '../types';
import { copyWithCommonParameters } from './common';
import { applyAfterParameters } from './fetch_entries_after';
import { applyBeforeParameters } from './fetch_entries_before';

export interface FetchEntriesAroundParameters {
  chunkSize: number;
  afterStartPosition: LogExplorerPosition; // inclusive start of the "future" interval
  beforeEndPosition: LogExplorerPosition; // inclusive end of the "past" interval
  sortCriteria: SortCriteria;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query | AggregateQuery | undefined;
}

export const fetchEntriesAround =
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
    beforeEndPosition,
    chunkSize,
    filters,
    query,
    sortCriteria,
    timeRange,
  }: FetchEntriesAroundParameters): Observable<{
    beforeResponse: IEsSearchResponse;
    afterResponse: IEsSearchResponse;
  }> => {
    const timeRangeFilter = timefilter.createFilter(dataView, timeRange);

    const commonSearchSource = copyWithCommonParameters({
      size: chunkSize,
      filters,
      query,
      timeRangeFilter,
    })(searchSource);

    // TODO: create and use point-in-time, not currently possible from client?
    const fetchBeforeSearchSource = applyBeforeParameters({
      dataView,
      beforeEndPosition,
      sortCriteria,
    })(commonSearchSource.createCopy());
    const fetchAfterSearchSource = applyAfterParameters({
      dataView,
      afterStartPosition,
      sortCriteria,
    })(commonSearchSource.createCopy());

    const {
      abortSignal: fetchBeforeAbortSignal,
      abortOnUnsubscribe: abortOnFetchBeforeUnsubsribe,
    } = createUnsubscriptionAbortSignal();
    const beforeResponse$ = fetchBeforeSearchSource
      .fetch$({
        abortSignal: fetchBeforeAbortSignal,
      })
      .pipe(abortOnFetchBeforeUnsubsribe());

    const { abortSignal: fetchAfterAbortSignal, abortOnUnsubscribe: abortOnFetchAfterUnsubsribe } =
      createUnsubscriptionAbortSignal();
    const afterResponse$ = fetchAfterSearchSource
      .fetch$({
        abortSignal: fetchAfterAbortSignal,
      })
      .pipe(abortOnFetchAfterUnsubsribe());

    return forkJoin({
      beforeResponse: beforeResponse$,
      afterResponse: afterResponse$,
    });
  };
