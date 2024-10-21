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
  Subscription,
  combineLatest,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { cloneDeep } from 'lodash';
import { RefreshInterval, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { dataService } from '../services/kibana_services';
import { DashboardCreationOptions, DashboardState } from './types';
import { DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';

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
  const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
  function setQuery(query: Query | AggregateQuery) {
    if (!fastIsEqual(query, query$.value)) {
      query$.next(query);
    }
  }
  function setAndSyncQuery(query: Query | AggregateQuery | undefined) {
    const queryOrDefault = query ?? queryString.getDefaultQuery();
    setQuery(queryOrDefault);
    if (creationOptions?.useUnifiedSearchIntegration) {
      queryString.setQuery(query ?? queryString.getDefaultQuery());
    }
  }
  const refreshInterval$ = new BehaviorSubject<RefreshInterval | undefined>(undefined);
  function setRefreshInterval(refreshInterval: RefreshInterval) {
    if (!fastIsEqual(refreshInterval, refreshInterval$.value)) {
      refreshInterval$.next(refreshInterval);
    }
  }
  function setAndSyncRefreshInterval(refreshInterval: RefreshInterval | undefined) {
    const refreshIntervalOrDefault =
      refreshInterval ?? timefilterService.getRefreshIntervalDefaults();
    setRefreshInterval(refreshIntervalOrDefault);
    if (creationOptions?.useUnifiedSearchIntegration) {
      timefilterService.setRefreshInterval(refreshIntervalOrDefault);
    }
  }
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
  function setTimeRange(timeRange: TimeRange) {
    if (!fastIsEqual(timeRange, timeRange$.value)) {
      timeRange$.next(timeRange);
    }
  }
  function setAndSyncTimeRange(timeRange: TimeRange | undefined) {
    const timeRangeOrDefault = timeRange ?? timefilterService.getTimeDefaults();
    setTimeRange(timeRangeOrDefault);
    if (creationOptions?.useUnifiedSearchIntegration) {
      timefilterService.setTime(timeRangeOrDefault);
    }
  }
  const timeRestore$ = new BehaviorSubject<boolean | undefined>(
    initialState?.timeRestore ?? DEFAULT_DASHBOARD_INPUT.timeRestore
  );
  function setTimeRestore(timeRestore: boolean) {
    if (timeRestore !== timeRestore$.value) timeRestore$.next(timeRestore);
  }
  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
  const unifiedSearchFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  function setUnifiedSearchFilters(unifiedSearchFilters: Filter[]) {
    if (!fastIsEqual(unifiedSearchFilters, unifiedSearchFilters$.value)) {
      unifiedSearchFilters$.next(unifiedSearchFilters);
    }
  }
  function setAndSyncUnifiedSearchFilters(unifiedSearchFilters: Filter[] | undefined) {
    const filtersOrDefault = unifiedSearchFilters ?? [];
    setUnifiedSearchFilters(filtersOrDefault);
    if (creationOptions?.useUnifiedSearchIntegration) {
      filterManager.setAppFilters(cloneDeep(filtersOrDefault));
    }
  }

  setAndSyncQuery(initialState.query);
  setAndSyncUnifiedSearchFilters(initialState.filters);
  if (initialState.timeRestore) {
    setAndSyncRefreshInterval(initialState.refreshInterval);
    setAndSyncTimeRange(initialState.timeRange);
  } else {
    setTimeRange(timefilterService.getTime());
    setRefreshInterval(timefilterService.getRefreshInterval());
  }

  // --------------------------------------------------------------------------------------
  // Set up control group integration
  // --------------------------------------------------------------------------------------
  const controlGroupSubscriptions: Subscription = new Subscription();
  const controlGroupFilters$ = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.filters$ : of(undefined)))
  );
  const controlGroupTimeslice$ = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.timeslice$ : of(undefined)))
  );
  controlGroupSubscriptions.add(
    combineLatest([unifiedSearchFilters$, controlGroupFilters$]).subscribe(
      ([unifiedSearchFilters, controlGroupFilters]) => {
        filters$.next([...(unifiedSearchFilters ?? []), ...(controlGroupFilters ?? [])]);
      }
    )
  );
  controlGroupSubscriptions.add(controlGroupFilters$.subscribe(() => panelsReload$.next()));
  controlGroupSubscriptions.add(
    controlGroupTimeslice$.subscribe((timeslice) => {
      if (timeslice !== timeslice$.value) timeslice$.next(timeslice);
    })
  );

  // --------------------------------------------------------------------------------------
  // Set up unified search integration.
  // --------------------------------------------------------------------------------------
  const unifiedSearchSubscriptions: Subscription = new Subscription();
  let stopSyncingWithUrl: (() => void) | undefined;
  if (
    creationOptions?.useUnifiedSearchIntegration &&
    creationOptions?.unifiedSearchSettings?.kbnUrlStateStorage
  ) {
    // start syncing global query state with the URL.
    const { stop } = syncGlobalQueryStateWithUrl(
      dataService.query,
      creationOptions?.unifiedSearchSettings.kbnUrlStateStorage
    );
    stopSyncingWithUrl = stop;

    unifiedSearchSubscriptions.add(
      filterManager.getUpdates$().subscribe(() => {
        setUnifiedSearchFilters(filterManager.getFilters());
      })
    );
    unifiedSearchSubscriptions.add(
      queryString.getUpdates$().subscribe(() => {
        setQuery(queryString.getQuery());
      })
    );
    unifiedSearchSubscriptions.add(
      timefilterService.getTimeUpdate$().subscribe(() => {
        setTimeRange(timefilterService.getTime());
      })
    );
    unifiedSearchSubscriptions.add(
      timefilterService.getRefreshIntervalUpdate$().subscribe(() => {
        setRefreshInterval(timefilterService.getRefreshInterval());
      })
    );
    unifiedSearchSubscriptions.add(
      timefilterService
        .getAutoRefreshFetch$()
        .pipe(
          tap(() => {
            controlGroupReload$.next();
            panelsReload$.next();
          }),
          switchMap((done) => waitForPanelsToLoad$.pipe(finalize(done)))
        )
        .subscribe()
    );
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
      setFilters: setAndSyncUnifiedSearchFilters,
      setQuery: setAndSyncQuery,
      setTimeRange: setAndSyncTimeRange,
      timeRange$,
      timeslice$,
    },
    comparators: {
      filters: [unifiedSearchFilters$, setAndSyncUnifiedSearchFilters, fastIsEqual],
      query: [query$, setAndSyncQuery, fastIsEqual],
      refreshInterval: [
        refreshInterval$,
        (refreshInterval: RefreshInterval | undefined) => {
          if (timeRestore$.value) setAndSyncRefreshInterval(refreshInterval);
        },
        (a: RefreshInterval | undefined, b: RefreshInterval | undefined) =>
          timeRestore$.value ? fastIsEqual(a, b) : true,
      ],
      timeRange: [
        timeRange$,
        (timeRange: TimeRange | undefined) => {
          if (timeRestore$.value) setAndSyncTimeRange(timeRange);
        },
        (a: TimeRange | undefined, b: TimeRange | undefined) =>
          timeRestore$.value ? fastIsEqual(a, b) : true,
      ],
      timeRestore: [timeRestore$, setTimeRestore],
    } as StateComparators<
      Pick<DashboardState, 'filters' | 'query' | 'refreshInterval' | 'timeRange' | 'timeRestore'>
    >,
    internalApi: {
      controlGroupReload$,
      panelsReload$,
      reset: (lastSavedState: DashboardState) => {
        setAndSyncQuery(lastSavedState.query);
        setTimeRestore(lastSavedState.timeRestore);
        setAndSyncUnifiedSearchFilters(lastSavedState.filters);
        if (lastSavedState.timeRestore) {
          setAndSyncRefreshInterval(lastSavedState.refreshInterval);
          setAndSyncTimeRange(lastSavedState.timeRange);
        }
      },
      getState: () => ({
        filters: unifiedSearchFilters$.value,
        query: query$.value,
        refreshInterval: refreshInterval$.value,
        timeRange: timeRange$.value,
        timeRestore: timeRestore$.value,
      }),
      setTimeRestore,
      timeRestore$,
    },
    cleanup: () => {
      controlGroupSubscriptions.unsubscribe();
      unifiedSearchSubscriptions.unsubscribe();
      stopSyncingWithUrl?.();
    },
  };
}
