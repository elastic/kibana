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
import { DashboardBuildContext, DashboardState } from '../../types';
import { DashboardSavedObject } from '../../saved_dashboards';
import { setFiltersAndQuery } from '../state/dashboard_state_slice';
import {
  syncQueryStateWithUrl,
  connectToQueryState,
  Filter,
  Query,
  waitUntilNextSessionCompletes$,
  QueryState,
} from '../../services/data';
import { cleanFiltersForSerialize } from '.';

type SyncDashboardFilterStateProps = DashboardBuildContext & {
  initialDashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
};

/**
 * Applies initial state to the query service, and the saved dashboard search source, then
 * Sets up syncing and subscriptions between the filter state from the Data plugin
 * and the dashboard Redux store.
 */
export const syncDashboardFilterState = ({
  search,
  savedDashboard,
  kbnUrlStateStorage,
  query: queryService,
  initialDashboardState,
  $checkForUnsavedChanges,
  $onDashboardStateChange,
  $triggerDashboardRefresh,
  dispatchDashboardStateChange,
}: SyncDashboardFilterStateProps) => {
  const { filterManager, queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  // apply initial dashboard filter state.
  applyDashboardFilterState({
    currentDashboardState: initialDashboardState,
    kbnUrlStateStorage,
    savedDashboard,
    queryService,
  });

  // this callback will be used any time new filters and query need to be applied.
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
  const intermediateFilterState: { filters: Filter[]; query: Query } = {
    query: initialDashboardState.query ?? queryString.getDefaultQuery(),
    filters: initialDashboardState.filters ?? [],
  };
  const stopSyncingAppFilters = connectToQueryState(
    queryService,
    {
      get: () => intermediateFilterState,
      set: ({ filters, query }) => {
        intermediateFilterState.filters = cleanFiltersForSerialize(filters ?? []) || [];
        intermediateFilterState.query = query || queryString.getDefaultQuery();
        applyFilters(intermediateFilterState.query, intermediateFilterState.filters);
        dispatchDashboardStateChange(setFiltersAndQuery(intermediateFilterState));
      },
      state$: $onDashboardStateChange.pipe(
        map((appState) => ({
          filters: appState.filters,
          query: appState.query,
        }))
      ),
    },
    {
      query: true,
      filters: true,
    }
  );

  // apply filters when the filter manager changes
  const filterManagerSubscription = merge(filterManager.getUpdates$(), queryString.getUpdates$())
    .pipe(debounceTime(100))
    .subscribe(() => applyFilters(queryString.getQuery(), filterManager.getFilters()));

  const timeRefreshSubscription = merge([
    timefilterService.getRefreshIntervalUpdate$(),
    timefilterService.getTimeUpdate$(),
  ]).subscribe(() => {
    $triggerDashboardRefresh.next({});

    // manually check for unsaved changes here because the time range is not stored on the dashboardState,
    // but it could trigger the unsaved changes badge.
    $checkForUnsavedChanges.next(undefined);
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

interface ApplyDashboardFilterStateProps {
  kbnUrlStateStorage: DashboardBuildContext['kbnUrlStateStorage'];
  queryService: DashboardBuildContext['query'];
  currentDashboardState: DashboardState;
  savedDashboard: DashboardSavedObject;
}

export const applyDashboardFilterState = ({
  currentDashboardState,
  kbnUrlStateStorage,
  savedDashboard,
  queryService,
}: ApplyDashboardFilterStateProps) => {
  const { filterManager, queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  // apply filters to the query service and to the saved dashboard
  filterManager.setAppFilters(_.cloneDeep(currentDashboardState.filters));
  savedDashboard.searchSource.setField('filter', currentDashboardState.filters);

  // apply query to the query service and to the saved dashboard
  queryString.setQuery(currentDashboardState.query);
  savedDashboard.searchSource.setField('query', currentDashboardState.query);

  /**
   * If a global time range is not set explicitly and the time range was saved with the dashboard, apply
   * time range and refresh interval to the query service.
   */
  if (currentDashboardState.timeRestore) {
    const globalQueryState = kbnUrlStateStorage.get<QueryState>('_g');
    if (!globalQueryState?.time) {
      if (savedDashboard.timeFrom && savedDashboard.timeTo) {
        timefilterService.setTime({
          from: savedDashboard.timeFrom,
          to: savedDashboard.timeTo,
        });
      }
    }
    if (!globalQueryState?.refreshInterval) {
      if (savedDashboard.refreshInterval) {
        timefilterService.setRefreshInterval(savedDashboard.refreshInterval);
      }
    }
  }
};
