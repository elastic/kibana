/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge, Subject } from 'rxjs';
import { distinctUntilChanged, finalize, switchMap, tap } from 'rxjs/operators';

import type { Filter, Query } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { cleanFiltersForSerialize } from '@kbn/presentation-util-plugin/public';
import { connectToQueryState, waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';

/**
 * Sets up syncing and subscriptions between the filter state from the Data plugin
 * and the dashboard Redux store.
 */
export function syncUnifiedSearchState(
  this: DashboardContainer,
  kbnUrlStateStorage: IKbnUrlStateStorage
) {
  const {
    data: { query: queryService, search },
  } = pluginServices.getServices();
  const { queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  const {
    getState,
    dispatch,
    onStateChange,
    actions: { setFiltersAndQuery, setTimeRange },
  } = this.reduxEmbeddableTools;

  // get Observable for when the dashboard's saved filters or query change.
  const OnFiltersChange$ = new Subject<{ filters: Filter[]; query: Query }>();
  const unsubscribeFromSavedFilterChanges = onStateChange(() => {
    const {
      explicitInput: { filters, query },
    } = getState();
    OnFiltersChange$.next({
      filters: filters ?? [],
      query: query ?? queryString.getDefaultQuery(),
    });
  });

  // starts syncing app filters between dashboard state and filterManager
  const {
    explicitInput: { filters, query },
  } = getState();
  const intermediateFilterState: { filters: Filter[]; query: Query } = {
    query: query ?? queryString.getDefaultQuery(),
    filters: filters ?? [],
  };

  const stopSyncingAppFilters = connectToQueryState(
    queryService,
    {
      get: () => intermediateFilterState,
      set: ({ filters: newFilters, query: newQuery }) => {
        intermediateFilterState.filters = cleanFiltersForSerialize(newFilters);
        intermediateFilterState.query = newQuery;
        dispatch(setFiltersAndQuery(intermediateFilterState));
      },
      state$: OnFiltersChange$.pipe(distinctUntilChanged()),
    },
    {
      query: true,
      filters: true,
    }
  );

  const timeRefreshSubscription = merge(
    timefilterService.getRefreshIntervalUpdate$(),
    timefilterService.getTimeUpdate$()
  ).subscribe(() => dispatch(setTimeRange(timefilterService.getTime())));

  const autoRefreshSubscription = timefilterService
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        this.forceRefresh();
      }),
      switchMap((done) =>
        // best way on a dashboard to estimate that panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();

  const stopSyncingUnifiedSearchState = () => {
    autoRefreshSubscription.unsubscribe();
    timeRefreshSubscription.unsubscribe();
    unsubscribeFromSavedFilterChanges();
    stopSyncingAppFilters();
  };

  return stopSyncingUnifiedSearchState;
}
