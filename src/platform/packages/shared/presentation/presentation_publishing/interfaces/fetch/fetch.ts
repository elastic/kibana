/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  delay,
  filter,
  map,
  merge,
  Observable,
  of,
  skip,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { useMemo, useEffect } from 'react';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  PublishesTimeRange,
  PublishesUnifiedSearch,
} from './publishes_unified_search';
import { apiPublishesSearchSession, PublishesSearchSession } from './publishes_search_session';
import { apiHasParentApi, HasParentApi } from '../has_parent_api';
import { apiPublishesReload } from './publishes_reload';
import { useStateFromPublishingSubject } from '../../publishing_subject';

export interface FetchContext {
  isReload: boolean;
  filters: Filter[] | undefined;
  query: Query | AggregateQuery | undefined;
  searchSessionId: string | undefined;
  timeRange: TimeRange | undefined;
  timeslice: [number, number] | undefined;
}

function getFetchContext(api: unknown, isReload: boolean) {
  const typeApi = api as Partial<
    PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>
  >;
  return {
    isReload,
    filters: typeApi?.parentApi?.filters$?.value,
    query: typeApi?.parentApi?.query$?.value,
    searchSessionId: typeApi?.parentApi?.searchSessionId$?.value,
    timeRange: typeApi?.timeRange$?.value ?? typeApi?.parentApi?.timeRange$?.value,
    timeslice: typeApi?.timeRange$?.value ? undefined : typeApi?.parentApi?.timeslice$?.value,
  };
}

function hasSearchSession(api: unknown) {
  return apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)
    ? typeof api.parentApi.searchSessionId$.value === 'string'
    : false;
}

function hasLocalTimeRange(api: unknown) {
  return apiPublishesTimeRange(api) ? typeof api.timeRange$.value === 'object' : false;
}

// Returns observables that emit to changes after subscribe
// 1. Observables are not guaranteed to have an initial value (can not be used in combineLatest)
// 2. Observables will not emit on subscribe
function getBatchedObservables(api: unknown): Array<Observable<unknown>> {
  const observables: Array<Observable<unknown>> = [];

  if (apiPublishesTimeRange(api)) {
    observables.push(api.timeRange$.pipe(skip(1)));
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    observables.push(
      combineLatest([api.parentApi.filters$, api.parentApi.query$]).pipe(
        skip(1),
        filter(() => !hasSearchSession(api))
      )
    );
  }

  if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)) {
    const timeObservables: Array<Observable<unknown>> = [api.parentApi.timeRange$];
    if (api.parentApi.timeslice$) {
      timeObservables.push(api.parentApi.timeslice$);
    }
    observables.push(
      combineLatest(timeObservables).pipe(
        skip(1),
        filter(() => !hasSearchSession(api) && !hasLocalTimeRange(api))
      )
    );
  }

  return observables;
}

// Returns observables that emit to changes after subscribe
// 1. Observables are not guaranteed to have an initial value (can not be used in combineLatest)
// 2. Observables will not emit on subscribe
function getImmediateObservables(api: unknown): Array<Observable<unknown>> {
  const observables: Array<Observable<unknown>> = [];
  if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
    observables.push(api.parentApi.searchSessionId$.pipe(skip(1)));
  }
  if (apiHasParentApi(api) && apiPublishesReload(api.parentApi)) {
    observables.push(api.parentApi.reload$.pipe(filter(() => !hasSearchSession(api))));
  }
  return observables;
}

export function fetch$(api: unknown): Observable<FetchContext> {
  const batchedObservables = getBatchedObservables(api);
  const immediateObservables = getImmediateObservables(api);

  if (immediateObservables.length === 0) {
    return merge(...batchedObservables).pipe(
      startWith(getFetchContext(api, false)),
      debounceTime(0),
      map(() => getFetchContext(api, false))
    );
  }

  const interrupt = new Subject<void>();
  const batchedChanges$ = merge(...batchedObservables).pipe(
    switchMap((value) =>
      of(value).pipe(
        delay(0),
        takeUntil(interrupt),
        map(() => getFetchContext(api, false))
      )
    )
  );

  const immediateChange$ = merge(...immediateObservables).pipe(
    tap(() => interrupt.next()),
    map(() => getFetchContext(api, true))
  );

  return merge(immediateChange$, batchedChanges$).pipe(startWith(getFetchContext(api, false)));
}

export const useFetchContext = (api: unknown): FetchContext => {
  const context$: BehaviorSubject<FetchContext> = useMemo(() => {
    return new BehaviorSubject<FetchContext>(getFetchContext(api, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subsctription = fetch$(api).subscribe((nextContext) => context$.next(nextContext));

    return () => subsctription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useStateFromPublishingSubject(context$);
};
