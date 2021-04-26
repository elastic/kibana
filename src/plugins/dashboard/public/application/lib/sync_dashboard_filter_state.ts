/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { merge } from 'rxjs';
import { debounceTime, finalize, map, switchMap, tap } from 'rxjs/operators';

import { setQuery } from '../state';
import { DashboardBuildContext } from '../../types';
import { DashboardSavedObject } from '../../saved_dashboards';
import { setFiltersAndQuery } from '../state/dashboard_state_slice';
import {
  syncQueryStateWithUrl,
  connectToQueryState,
  esFilters,
  Filter,
  Query,
  waitUntilNextSessionCompletes$,
} from '../../services/data';
import { cleanFiltersForSerialize } from '.';

type SyncDashboardFilterStateProps = DashboardBuildContext & {
  savedDashboard: DashboardSavedObject;
};

/**
 * Sets up syncing and subscriptions between the filter state from the Data plugin
 * and the dashboard Redux store.
 */
export const syncDashboardFilterState = ({
  services,
  $checkForUnsavedChanges,
  savedDashboard,
  kbnUrlStateStorage,
  $onDashboardStateChange,
  getLatestDashboardState,
  $triggerDashboardRefresh,
  dispatchDashboardStateChange,
}: SyncDashboardFilterStateProps) => {
  const {
    data: { query: queryService, search },
  } = services;
  const { filterManager, queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  const applyFilters = (query: Query, filters: Filter[]) => {
    savedDashboard.searchSource.setField('query', query);
    savedDashboard.searchSource.setField('filter', filters);
    dispatchDashboardStateChange(setQuery(query));
  };

  // starts syncing `_g` portion of url with query services
  const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
    queryService,
    kbnUrlStateStorage
  );

  // starts syncing app filters between dashboard state and filterManager
  const stopSyncingAppFilters = connectToQueryState(
    queryService,
    {
      set: ({ filters, query }) =>
        dispatchDashboardStateChange(
          setFiltersAndQuery({
            query: query || queryString.getDefaultQuery(),
            filters: cleanFiltersForSerialize(filters) || [],
          })
        ),
      get: () => ({
        filters: getLatestDashboardState().filters,
        query: getLatestDashboardState().query,
      }),
      state$: $onDashboardStateChange.pipe(
        map((appState) => ({
          filters: appState.filters,
          query: queryString.formatQuery(appState.query),
        }))
      ),
    },
    {
      filters: esFilters.FilterStateStore.APP_STATE,
      query: true,
    }
  );

  const filterManagerSubscription = merge(filterManager.getUpdates$(), queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => applyFilters(queryString.getQuery(), filterManager.getFilters()));

  const timeRefreshSubscription = merge(
    ...[timefilterService.getRefreshIntervalUpdate$(), timefilterService.getTimeUpdate$()]
  ).subscribe(() => {
    $triggerDashboardRefresh.next();

    // manually check for unsaved changes here because the time range is not stored on the dashboardState,
    // but it could trigger the unsaved changes badge.
    $checkForUnsavedChanges.next();
  });

  const forceRefreshSubscription = timefilterService
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        $triggerDashboardRefresh.next({ force: true });
      }),
      switchMap((done) =>
        // best way on a dashboard to estimate that panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();

  const stopSyncingDashboardFilterState = () => {
    filterManagerSubscription.unsubscribe();
    forceRefreshSubscription.unsubscribe();
    timeRefreshSubscription.unsubscribe();
    stopSyncingQueryServiceStateWithUrl();
    stopSyncingAppFilters();
  };

  return { applyFilters, stopSyncingDashboardFilterState };
};
