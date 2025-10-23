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
  combineLatest,
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { useStateFromPublishingSubject } from '../../publishing_subject';
import { apiHasParentApi } from '../has_parent_api';
import { isReloadTimeFetchContextEqual, type FetchContext } from './fetch_context';
import { apiPublishesPauseFetch } from './publishes_pause_fetch';
import { apiPublishesTimeRange, apiPublishesUnifiedSearch } from './publishes_unified_search';

function hasLocalTimeRange(api: unknown) {
  return apiPublishesTimeRange(api) ? typeof api.timeRange$.value === 'object' : false;
}

function getFetchContext$(api: unknown) {
  const observables: {
    [key in keyof FetchContext]: Observable<FetchContext[key]>;
  } = {
    filters: of(undefined),
    query: of(undefined),
    searchSessionId: of(undefined),
    timeRange: of(undefined),
    timeslice: of(undefined),
    isReload: of(false),
  };

  if (apiPublishesTimeRange(api)) {
    observables.timeRange = api.timeRange$;
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    observables.filters = api.parentApi.filters$;
    observables.query = api.parentApi.query$;
  }

  if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)) {
    observables.timeRange = api.parentApi.timeRange$.pipe(filter(() => !hasLocalTimeRange(api)));
    if (api.parentApi.timeslice$) {
      observables.timeslice = api.parentApi.timeslice$.pipe(filter(() => !hasLocalTimeRange(api)));
    }
  }

  // if (apiHasParentApi(api) && apiPublishesReload(api.parentApi)) {
  //   api.parentApi.reload$.subscribe(() => {
  //     observables.isReload(true);
  //   });
  // }
  console.log(observables);
  return combineLatest(observables);
}

export function fetch$(api: unknown): Observable<FetchContext> {
  const fetchContext$ = getFetchContext$(api);

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
    combineLatestWith(isFetchPaused$.pipe(distinctUntilChanged())),
    filter(([, isFetchPaused]) => !isFetchPaused),
    map(([fetchContext]) => fetchContext),
    distinctUntilChanged((prevContext, nextContext) =>
      isReloadTimeFetchContextEqual(prevContext, nextContext)
    ),
    switchMap(async (context) => {
      const searchSessionId = await ((api as any).parentApi as any).requestSearchSessionId();
      console.log({ context });
      return {
        ...context,
        searchSessionId,
        // isReload: Boolean(reloadTimeFetchContext.reloadTimestamp),
      };
    })
    // debounceTime(0)
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
