/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { distinctUntilChanged, finalize, switchMap, tap } from 'rxjs';

import type { Filter, Query } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { cleanFiltersForSerialize } from '@kbn/presentation-util-plugin/public';
import {
  connectToQueryState,
  GlobalQueryStateFromUrl,
  waitUntilNextSessionCompletes$,
} from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { pluginServices } from '../../../../services/plugin_services';
import { GLOBAL_STATE_STORAGE_KEY } from '../../../../dashboard_constants';
import { areTimesEqual } from '../../../state/diffing/dashboard_diffing_utils';

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

  // get Observable for when the dashboard's saved filters or query change.
  const OnFiltersChange$ = new Subject<{ filters: Filter[]; query: Query }>();
  const unsubscribeFromSavedFilterChanges = this.onStateChange(() => {
    const {
      explicitInput: { filters, query },
    } = this.getState();
    OnFiltersChange$.next({
      filters: filters ?? [],
      query: query ?? queryString.getDefaultQuery(),
    });
  });

  // starts syncing app filters between dashboard state and filterManager
  const {
    explicitInput: { filters, query },
  } = this.getState();
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
        this.dispatch.setFiltersAndQuery(intermediateFilterState);
      },
      state$: OnFiltersChange$.pipe(distinctUntilChanged()),
    },
    {
      query: true,
      filters: true,
    }
  );

  const timeUpdateSubscription = timefilterService.getTimeUpdate$().subscribe(() => {
    const newTimeRange = (() => {
      // if there is an override time range in the URL, use it.
      const urlOverrideTimeRange =
        kbnUrlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_STORAGE_KEY)?.time;
      if (urlOverrideTimeRange) return urlOverrideTimeRange;

      // if there is no url override time range, check if this dashboard uses time restore, and restore to that.
      const timeRestoreTimeRange =
        this.getState().explicitInput.timeRestore &&
        this.getState().componentState.lastSavedInput.timeRange;
      if (timeRestoreTimeRange) {
        timefilterService.setTime(timeRestoreTimeRange);
        return timeRestoreTimeRange;
      }

      // otherwise fall back to the time range from the time filter service
      return timefilterService.getTime();
    })();

    const lastTimeRange = this.getState().explicitInput.timeRange;
    if (
      !areTimesEqual(newTimeRange.from, lastTimeRange?.from) ||
      !areTimesEqual(newTimeRange.to, lastTimeRange?.to)
    ) {
      this.dispatch.setTimeRange(newTimeRange);
    }
  });

  const refreshIntervalSubscription = timefilterService
    .getRefreshIntervalUpdate$()
    .subscribe(() => {
      const newRefreshInterval = (() => {
        // if there is an override refresh interval in the URL, dispatch that to the dashboard.
        const urlOverrideRefreshInterval =
          kbnUrlStateStorage.get<GlobalQueryStateFromUrl>(
            GLOBAL_STATE_STORAGE_KEY
          )?.refreshInterval;
        if (urlOverrideRefreshInterval) return urlOverrideRefreshInterval;

        // if there is no url override refresh interval, check if this dashboard uses time restore, and restore to that.
        const timeRestoreRefreshInterval =
          this.getState().explicitInput.timeRestore &&
          this.getState().componentState.lastSavedInput.refreshInterval;
        if (timeRestoreRefreshInterval) {
          timefilterService.setRefreshInterval(timeRestoreRefreshInterval);
          return timeRestoreRefreshInterval;
        }

        // otherwise fall back to the refresh interval from the time filter service
        return timefilterService.getRefreshInterval();
      })();

      const lastRefreshInterval = this.getState().explicitInput.refreshInterval;
      if (!fastIsEqual(newRefreshInterval, lastRefreshInterval)) {
        this.dispatch.setRefreshInterval(newRefreshInterval);
      }
    });

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
    timeUpdateSubscription.unsubscribe();
    refreshIntervalSubscription.unsubscribe();
    unsubscribeFromSavedFilterChanges();
    stopSyncingAppFilters();
  };

  return stopSyncingUnifiedSearchState;
}
