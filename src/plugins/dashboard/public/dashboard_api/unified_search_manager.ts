/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { cloneDeep } from 'lodash';
import { RefreshInterval, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { dataService } from '../services/kibana_services';
import { DashboardCreationOptions, DashboardState } from './types';

export function initializeUnifiedSearchManager(
  initialState: DashboardState,
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>,
  waitForPanelsToLoad$: Observable<void>,
  creationOptions?: DashboardCreationOptions
) {
  const {
    queryString,
    filterManager,
    timefilter: { timefilter: timefilterService },
  } = dataService.query;

  const controlGroupReload$ = new Subject<void>();
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const panelsReload$ = new Subject<void>();
  const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(initialState.query);
  const refreshInterval$ = new BehaviorSubject<RefreshInterval | undefined>(
    initialState.refreshInterval
  );
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(initialState.timeRange);
  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(initialState.timeslice);
  const unifiedSearchFilters$ = new BehaviorSubject<Filter[] | undefined>(initialState.filters);

  // --------------------------------------------------------------------------------------
  // Set up control group integration
  // --------------------------------------------------------------------------------------
  const controlGroupFilters$ = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.filters$ : of(undefined)))
  );
  const controlGroupTimeslice$ = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.timeslice$ : of(undefined)))
  );
  const filtersSubscription = combineLatest([
    unifiedSearchFilters$,
    controlGroupFilters$,
  ]).subscribe(([unifiedSearchFilters, controlGroupFilters]) => {
    filters$.next([...(unifiedSearchFilters ?? []), ...(controlGroupFilters ?? [])]);
  });
  const reloadPanelsSubscription = controlGroupFilters$.subscribe(() => panelsReload$.next());
  const timesliceSubscription = controlGroupTimeslice$.subscribe((timeslice) => {
    if (timeslice !== timeslice$.value) timeslice$.next(timeslice);
  });
  const stopSyncingWithControlGroup = () => {
    filtersSubscription.unsubscribe();
    reloadPanelsSubscription.unsubscribe();
    timesliceSubscription.unsubscribe();
  };

  // --------------------------------------------------------------------------------------
  // Set up unified search integration.
  // --------------------------------------------------------------------------------------
  let stopSyncingWithUnifiedSearch: (() => void) | undefined;
  if (
    creationOptions?.useUnifiedSearchIntegration &&
    creationOptions?.unifiedSearchSettings?.kbnUrlStateStorage
  ) {
    // Set unified search to dashboard state
    filterManager.setAppFilters(cloneDeep(unifiedSearchFilters$.value ?? []));
    queryString.setQuery(query$.value ?? queryString.getDefaultQuery());
    if (initialState.timeRestore) {
      if (timeRange$.value) timefilterService.setTime(timeRange$.value);
      if (refreshInterval$.value) timefilterService.setRefreshInterval(refreshInterval$.value);
    }

    // start syncing global query state with the URL.
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
      dataService.query,
      creationOptions?.unifiedSearchSettings.kbnUrlStateStorage
    );

    const unifiedSearchFiltersSubscription = filterManager.getUpdates$().subscribe(() => {
      const nextUnifiedSearchFilters = filterManager.getFilters();
      if (!fastIsEqual(nextUnifiedSearchFilters, unifiedSearchFilters$.value)) {
        unifiedSearchFilters$.next(nextUnifiedSearchFilters);
      }
    });
    const querySubscription = queryString.getUpdates$().subscribe(() => {
      const nextQuery = queryString.getQuery();
      if (!fastIsEqual(nextQuery, query$.value)) {
        query$.next(nextQuery);
      }
    });
    const timeRangeSubscription = timefilterService.getTimeUpdate$().subscribe(() => {
      const nextTimeRange = timefilterService.getTime();
      if (!fastIsEqual(nextTimeRange, timeRange$.value)) {
        timeRange$.next(nextTimeRange);
      }
    });
    const refreshIntervalSubscription = timefilterService
      .getRefreshIntervalUpdate$()
      .subscribe(() => {
        const nextRefreshInternal = timefilterService.getRefreshInterval();
        if (!fastIsEqual(nextRefreshInternal, refreshInterval$.value)) {
          refreshInterval$.next(nextRefreshInternal);
        }
      });
    const autoRefreshSubscription = timefilterService
      .getAutoRefreshFetch$()
      .pipe(
        tap(() => {
          controlGroupReload$.next();
          panelsReload$.next();
        }),
        switchMap((done) => waitForPanelsToLoad$.pipe(finalize(done)))
      )
      .subscribe();
    stopSyncingWithUnifiedSearch = () => {
      stopSyncingQueryServiceStateWithUrl();
      autoRefreshSubscription.unsubscribe();
      querySubscription.unsubscribe();
      refreshIntervalSubscription.unsubscribe();
      timeRangeSubscription.unsubscribe();
      unifiedSearchFiltersSubscription.unsubscribe();
    };
  }

  return {
    api: {
      filters$,
      forceRefresh: () => {
        controlGroupReload$.next();
        panelsReload$.next();
      },
      query$,
      refreshInterval$,
      timeRange$,
      timeslice$,
    },
    internalApi: {
      controlGroupReload$,
      panelsReload$,
      reset: (lastSavedState: DashboardState) => {
        if (!fastIsEqual(lastSavedState.filters, unifiedSearchFilters$.value)) {
          unifiedSearchFilters$.next(lastSavedState.filters);
          filterManager.setAppFilters(cloneDeep(lastSavedState.filters ?? []));
        }
        if (!fastIsEqual(lastSavedState.query, query$.value)) {
          query$.next(lastSavedState.query);
          queryString.setQuery(query$.value ?? queryString.getDefaultQuery());
        }

        if (creationOptions?.useUnifiedSearchIntegration && lastSavedState.timeRestore) {
          if (!fastIsEqual(lastSavedState.timeRange, timeRange$.value)) {
            timeRange$.next(lastSavedState.timeRange);
            if (lastSavedState.timeRange) timefilterService.setTime(lastSavedState.timeRange);
          }
          if (!fastIsEqual(lastSavedState.refreshInterval, refreshInterval$.value)) {
            refreshInterval$.next(lastSavedState.refreshInterval);
            if (lastSavedState.refreshInterval)
              timefilterService.setRefreshInterval(lastSavedState.refreshInterval);
          }
        }
      },
    },
    cleanup: () => {
      stopSyncingWithControlGroup();
      stopSyncingWithUnifiedSearch?.();
    },
  };
}
