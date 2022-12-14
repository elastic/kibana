/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { merge } from 'rxjs';
import { finalize, map, switchMap, tap } from 'rxjs/operators';
import {
  connectToQueryState,
  GlobalQueryStateFromUrl,
  syncGlobalQueryStateWithUrl,
  waitUntilNextSessionCompletes$,
} from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';

import { cleanFiltersForSerialize } from '.';
import type { DashboardBuildContext, DashboardState } from '../../types';
import { setFiltersAndQuery } from '../state/dashboard_state_slice';
import { pluginServices } from '../../services/plugin_services';

type SyncDashboardFilterStateProps = DashboardBuildContext & {
  initialDashboardState: DashboardState;
};

/**
 * Applies initial state to the query service, and the saved dashboard search source, then
 * Sets up syncing and subscriptions between the filter state from the Data plugin
 * and the dashboard Redux store.
 */
export const syncDashboardFilterState = ({
  kbnUrlStateStorage,
  initialDashboardState,
  $checkForUnsavedChanges,
  $onDashboardStateChange,
  $triggerDashboardRefresh,
  dispatchDashboardStateChange,
}: SyncDashboardFilterStateProps) => {
  const {
    data: { query: queryService, search },
  } = pluginServices.getServices();
  const { queryString, timefilter } = queryService;
  const { timefilter: timefilterService } = timefilter;

  // apply initial dashboard filter state.
  applyDashboardFilterState({
    currentDashboardState: initialDashboardState,
    kbnUrlStateStorage,
  });

  // starts syncing `_g` portion of url with query services
  const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
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

  const timeRefreshSubscription = merge(
    timefilterService.getRefreshIntervalUpdate$(),
    timefilterService.getTimeUpdate$()
  ).subscribe(() => {
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
    forceRefreshSubscription.unsubscribe();
    timeRefreshSubscription.unsubscribe();
    stopSyncingQueryServiceStateWithUrl();
    stopSyncingAppFilters();
  };

  return { stopSyncingDashboardFilterState };
};

interface ApplyDashboardFilterStateProps {
  kbnUrlStateStorage: DashboardBuildContext['kbnUrlStateStorage'];
  currentDashboardState: DashboardState;
}

export const applyDashboardFilterState = ({
  currentDashboardState,
  kbnUrlStateStorage,
}: ApplyDashboardFilterStateProps) => {
  const {
    data: {
      query: { filterManager, queryString, timefilter },
    },
  } = pluginServices.getServices();
  const { timefilter: timefilterService } = timefilter;

  // apply filters and query to the query service
  filterManager.setAppFilters(_.cloneDeep(currentDashboardState.filters));
  queryString.setQuery(currentDashboardState.query);

  /**
   * If a global time range is not set explicitly and the time range was saved with the dashboard, apply
   * time range and refresh interval to the query service.
   */
  if (currentDashboardState.timeRestore) {
    const globalQueryState = kbnUrlStateStorage.get<GlobalQueryStateFromUrl>('_g');
    if (!globalQueryState?.time && currentDashboardState.timeRange) {
      timefilterService.setTime(currentDashboardState.timeRange);
    }
    if (!globalQueryState?.refreshInterval && currentDashboardState.refreshInterval) {
      timefilterService.setRefreshInterval(currentDashboardState.refreshInterval);
    }
  }
};
