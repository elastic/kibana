/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  delay,
  distinctUntilChanged,
  filter,
  map,
  merge,
  of,
  skip,
  startWith,
  switchMap,
  takeUntil,
  tap,
  type Observable,
} from 'rxjs';
import { useStateFromPublishingSubject } from '../../publishing_subject';
import { apiHasParentApi, type HasParentApi } from '../has_parent_api';
import {
  type FetchContext,
  type ReloadTimeFetchContext,
  isReloadTimeFetchContextEqual,
} from './fetch_context';
import { apiPublishesPauseFetch } from './publishes_pause_fetch';
import { apiPublishesReload } from './publishes_reload';
import { apiPublishesSearchSession, type PublishesSearchSession } from './publishes_search_session';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  type PublishesTimeRange,
  type PublishesUnifiedSearch,
} from './publishes_unified_search';
import { apiHasUniqueId } from '../has_uuid';

function getReloadTimeFetchContext(api: unknown, reloadTimestamp?: number): ReloadTimeFetchContext {
  const typeApi = api as Partial<
    PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>
  >;

  const uuid = apiHasUniqueId(typeApi) ? typeApi.uuid : undefined;
  const section = typeApi.parentApi?.layout$.getValue().panels[uuid]?.grid?.sectionId;
  // console.log({ section });
  const allFilters = typeApi?.parentApi?.filters$?.value;
  const filters = uuid
    ? allFilters?.filter(
        (currentFilter) =>
          currentFilter.meta.controlledBy !== uuid &&
          (currentFilter.meta.group ? currentFilter.meta.group === section : true)
      )
    : allFilters;
  return {
    reloadTimestamp,
    filters,
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
    const sectionId$: Observable<string | undefined> = api.parentApi?.getPanelSection$(api.uuid);
    observables.push(
      combineLatest([api.parentApi.filters$, api.parentApi.query$, sectionId$]).pipe(
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
  // observables.push(api.parentApi?.getPanelSection$(api.uuid));

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
  // const sectionId$: Observable<string | undefined> = api.parentApi?.getPanelSection$(api.uuid);
  observables.push(api.parentApi?.getPanelSection$(api.uuid));
  return observables;
}

export function fetch$(api: unknown): Observable<FetchContext> {
  const batchedObservables = getBatchedObservables(api);
  const immediateObservables = getImmediateObservables(api);

  const fetchContext$ = (() => {
    if (immediateObservables.length === 0) {
      return merge(...batchedObservables).pipe(
        startWith(getReloadTimeFetchContext(api)),
        debounceTime(0),
        map(() => getReloadTimeFetchContext(api))
      );
    }
    const interrupt = new Subject<void>();
    const batchedChanges$ = merge(...batchedObservables).pipe(
      switchMap((value) =>
        of(value).pipe(
          delay(0),
          takeUntil(interrupt),
          map(() => getReloadTimeFetchContext(api))
        )
      )
    );

    const immediateChange$ = merge(...immediateObservables).pipe(
      tap(() => {
        interrupt.next();
      }),
      map(() => getReloadTimeFetchContext(api, Date.now()))
    );
    return merge(immediateChange$, batchedChanges$).pipe(startWith(getReloadTimeFetchContext(api)));
  })();

  const parentPauseFetch =
    apiHasParentApi(api) && apiPublishesPauseFetch(api.parentApi)
      ? api.parentApi.isFetchPaused$
      : of(false);
  const apiPauseFetch = apiPublishesPauseFetch(api) ? api.isFetchPaused$ : of(false);
  const isFetchPaused$ = combineLatest([parentPauseFetch, apiPauseFetch]).pipe(
    map(
      ([parentRequestingPause, apiRequestingPause]) => parentRequestingPause || apiRequestingPause
    )
  );

  return fetchContext$.pipe(
    // tap((reloadTimeFetchContext) => {
    //   if (api.uuid !== '68f74abf-99d0-4cef-b982-52b07de82444')
    //     console.log({ reloadTimeFetchContext });
    // }),
    combineLatestWith(isFetchPaused$),
    filter(([, isFetchPaused]) => !isFetchPaused),
    map(([fetchContext]) => fetchContext),
    distinctUntilChanged((prevContext, nextContext) =>
      isReloadTimeFetchContextEqual(prevContext, nextContext)
    ),
    map((reloadTimeFetchContext) => ({
      isReload: Boolean(reloadTimeFetchContext.reloadTimestamp),
      filters: reloadTimeFetchContext.filters,
      query: reloadTimeFetchContext.query,
      timeRange: reloadTimeFetchContext.timeRange,
      timeslice: reloadTimeFetchContext.timeslice,
      searchSessionId: reloadTimeFetchContext.searchSessionId,
    })),
    tap((context) => {
      if (api.uuid === '6664ab4d-b360-4a00-9a9f-849cd752f9d5') console.log({ context });
    })
  );
}

export const useFetchContext = (api: unknown): FetchContext => {
  const context$: BehaviorSubject<FetchContext> = useMemo(() => {
    return new BehaviorSubject<FetchContext>({
      ...getReloadTimeFetchContext(api),
      isReload: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subsctription = fetch$(api).subscribe((nextContext) => context$.next(nextContext));

    return () => subsctription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useStateFromPublishingSubject(context$);
};
