/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  combineLatest,
  combineLatestWith,
  debounceTime,
  delay,
  filter,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  PublishesTimeRange,
  PublishesUnifiedSearch,
} from './publishes_unified_search';
import { apiPublishesSearchSession, PublishesSearchSession } from './publishes_search_session';
import { apiHasParentApi, HasParentApi } from '../has_parent_api';
import { apiPublishesReload } from './publishes_reload';

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

function getDelayedObservables(api: unknown): Observable<unknown>[] {
  const delayedObservables: Observable<unknown>[] = [];

  if (apiPublishesTimeRange(api)) {
    delayedObservables.push(api.timeRange$.pipe(tap(() => console.log('timeRange$ emit'))));
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    delayedObservables.push(
      combineLatest([api.parentApi.filters$, api.parentApi.query$]).pipe(
        filter(() => !hasSearchSession(api))
      )
    );

    if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)) {
      const timeObservables: Array<Observable<unknown>> = [api.parentApi.timeRange$];
      if (api.parentApi.timeslice$) {
        timeObservables.push(api.parentApi.timeslice$);
      }
      delayedObservables.push(
        combineLatest(timeObservables).pipe(
          filter(() => !hasSearchSession(api) && !hasLocalTimeRange(api))
        )
      );
    }
  }

  return delayedObservables;
}

function getImmediateObservables(api: unknown): Observable<unknown>[] {
  const immediateObservables: Observable<unknown>[] = [];
  if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
    immediateObservables.push(api.parentApi.searchSessionId$);
  }
  if (apiHasParentApi(api) && apiPublishesReload(api.parentApi)) {
    immediateObservables.push(
      api.parentApi.reload$.pipe(
        filter(() => !hasSearchSession(api)),
      )
    );
  }
  return immediateObservables;
}

export function getFetch$(api: unknown): Observable<FetchContext> {
  const delayedObservables = getDelayedObservables(api);
  const immediateObservables = getImmediateObservables(api);

  console.log('delayedObservables count', delayedObservables.length);

  if (immediateObservables.length === 0) {
    return merge(...delayedObservables).pipe(
      debounceTime(0),
      map(() => (getFetchContext(api, false)))
    );
  }

  const interrupt = new Subject<void>();
  const cancellableChanges$ = merge(...delayedObservables).pipe(
    tap(() => console.log('delayedObservables emit')),
    switchMap((value) =>
      of(value).pipe(
        delay(1),
        takeUntil(interrupt),
        tap(() => console.log('cancellableChanges$ emit')),
        map(() => (getFetchContext(api, false)))
      )
    )
  );

  const immediateChange$ = merge(...immediateObservables).pipe(
    tap(() => interrupt.next()),
    tap(() => console.log('immediateChange$ emit')),
    map(() => (getFetchContext(api, true)))
  );

  return merge(immediateChange$, cancellableChanges$);*/
}
