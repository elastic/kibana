/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineLatest, skip, Subscription } from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { apiPublishesTimeRange, apiPublishesUnifiedSearch, PublishesTimeRange, PublishesUnifiedSearch } from './publishes_unified_search';
import { apiPublishesSearchSession, PublishesSearchSession } from './publishes_search_session';
import { apiHasParentApi, HasParentApi } from '../has_parent_api';

export type FetchContext = {
  filters: Filter[] | undefined;
  query: Query | AggregateQuery | undefined;
  searchSessionId: string | undefined;
  timeRange: TimeRange | undefined;
  timeslice: [number, number] | undefined;
};

function getFetchContext(api: unknown) {
  const typeApi = api as Partial<PublishesTimeRange & HasParentApi<Partial<PublishesUnifiedSearch & PublishesSearchSession>>>;
  return {
    filters: typeApi?.parentApi?.filters$?.value,
    query: typeApi?.parentApi?.query$?.value,
    searchSessionId: typeApi?.parentApi?.searchSessionId$?.value,
    timeRange: typeApi?.timeRange$?.value ?? typeApi?.parentApi?.timeRange$?.value,
    timeslice: typeApi?.timeRange$?.value
      ? undefined
      : typeApi?.parentApi?.timeslice$?.value,
  };
}

export function onFetchContextChanged({
  api,
  onFetch,
  fetchOnSetup,
}: {
  api: unknown;
  onFetch: (fetchContext: FetchContext, isCanceled: () =>  boolean) => void;
  fetchOnSetup: boolean;
}): () => void {
  let fetchSymbol: Symbol | undefined;
  const subscriptions: Subscription[] = [];

  if (apiPublishesTimeRange(api)) {
    subscriptions.push(api.timeRange$.pipe(skip(1)).subscribe(() => {
      const currentFetchSymbol = Symbol();
      fetchSymbol = currentFetchSymbol;
      console.log('onFetch from timeRange$');
      onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
    }));
  }

  if (apiHasParentApi(api) && apiPublishesSearchSession(api.parentApi)) {
    subscriptions.push(api.parentApi?.searchSessionId$.pipe(skip(1)).subscribe(() => {
      const currentFetchSymbol = Symbol();
      fetchSymbol = currentFetchSymbol;
      console.log('onFetch from searchSessionId$');
      onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
    }));
  }

  if (apiHasParentApi(api) && apiPublishesUnifiedSearch(api.parentApi)) {
    subscriptions.push(combineLatest([api.parentApi.filters$, api.parentApi.query$]).pipe(skip(1)).subscribe(() => {
      // Ignore change when searchSessionId is provided.
      if ((api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value) {
        return;
      }
      const currentFetchSymbol = Symbol();
      fetchSymbol = currentFetchSymbol;
      console.log('onFetch from parentApi.filters$ and parentApi.query$');
      onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
    }));
    subscriptions.push(api.parentApi?.timeRange$.pipe(skip(1)).subscribe(() => {
      // Ignore changes when searchSessionId is provided or local time range is provided.
      if ((api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value || (api as Partial<PublishesTimeRange>).timeRange$?.value) {
        return;
      }
      const currentFetchSymbol = Symbol();
      fetchSymbol = currentFetchSymbol;
      console.log('onFetch from parentApi.timeRange$');
      onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
    }));
    if (api.parentApi.timeslice$) {
      subscriptions.push(api.parentApi?.timeslice$.pipe(skip(1)).subscribe(() => {
        // Ignore changes when searchSessionId is provided or local time range is provided.
        if ((api?.parentApi as Partial<PublishesSearchSession>)?.searchSessionId$?.value || (api as Partial<PublishesTimeRange>).timeRange$?.value) {
          return;
        }
        const currentFetchSymbol = Symbol();
        fetchSymbol = currentFetchSymbol;
        console.log('onFetch from parentApi.timeslice$');
        onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
      }));
    }
  }

  if (fetchOnSetup) {
    const currentFetchSymbol = Symbol();
    fetchSymbol = currentFetchSymbol;
    console.log('onFetch on setup');
    onFetch(getFetchContext(api), () => fetchSymbol !== currentFetchSymbol);
  }
  
  return () => {
    subscriptions.forEach(subcription => subcription.unsubscribe());
  }
}