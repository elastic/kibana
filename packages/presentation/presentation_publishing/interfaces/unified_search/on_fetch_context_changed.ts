/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import { combineLatest, Observable, skip, Subscription } from 'rxjs';
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

export function onFetchContextChanged({
  api,
  onFetch,
  fetchOnSetup,
}: {
  api: unknown;
  onFetch: (fetchContext: FetchContext, isCanceled: () => boolean) => void;
  fetchOnSetup: boolean;
}): () => void {
  let fetchSymbol: symbol | undefined;
  const debouncedFetch = debounce(fetch, 0);
  function fetch(isReload: boolean = false) {
    const currentFetchSymbol = Symbol();
    fetchSymbol = currentFetchSymbol;
    onFetch(getFetchContext(api, isReload), () => fetchSymbol !== currentFetchSymbol);
  }

  const subscriptions: Subscription[] = [];

  if (apiPublishesTimeRange(api)) {
    subscriptions.push(
      api.timeRange$.pipe(skip(1)).subscribe(() => {
        debouncedFetch();
      })
    );
  }

  if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
    subscriptions.push(
      api.parentApi?.searchSessionId$.pipe(skip(1)).subscribe(() => {
        debouncedFetch.cancel();
        fetch(true);
      })
    );
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    subscriptions.push(
      combineLatest([api.parentApi.filters$, api.parentApi.query$])
        .pipe(skip(1))
        .subscribe(() => {
          // Ignore change when searchSessionId is provided.
          if ((api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value) {
            return;
          }
          debouncedFetch();
        })
    );

    if (apiHasParentApi(api) && apiPublishesTimeRange(api.parentApi)) {
      const timeObservables: Array<Observable<unknown>> = [api.parentApi.timeRange$];
      if (api.parentApi.timeslice$) {
        timeObservables.push(api.parentApi.timeslice$);
      }
      subscriptions.push(
        combineLatest(timeObservables)
          .pipe(skip(1))
          .subscribe(() => {
            // Ignore changes when searchSessionId is provided or local time range is provided.
            if (
              (api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value ||
              (api as Partial<PublishesTimeRange>).timeRange$?.value
            ) {
              return;
            }
            debouncedFetch();
          })
      );
    }
    if (apiHasParentApi(api) && apiPublishesReload(api.parentApi)) {
      subscriptions.push(
        api.parentApi.reload$.subscribe(() => {
          // Ignore changes when searchSessionId is provided
          if ((api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value) {
            return;
          }
          debouncedFetch.cancel();
          fetch(true);
        })
      );
    }
  }

  if (fetchOnSetup) {
    debouncedFetch();
  }

  return () => {
    subscriptions.forEach((subcription) => subcription.unsubscribe());
  };
}
