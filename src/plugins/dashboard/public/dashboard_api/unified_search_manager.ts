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
  function setQuery(query: Query | AggregateQuery | undefined) {
    if (!fastIsEqual(query, query$.value)) {
      query$.next(query);
    }
    const queryOrDefault = query ?? queryString.getDefaultQuery();
    if (
      creationOptions?.useUnifiedSearchIntegration &&
      !fastIsEqual(queryOrDefault, queryString.getQuery())
    ) {
      queryString.setQuery(queryOrDefault);
    }
  }
  const refreshInterval$ = new BehaviorSubject<RefreshInterval | undefined>(undefined);
  function setRefreshInterval(refreshInterval: RefreshInterval | undefined) {
    if (!fastIsEqual(refreshInterval, refreshInterval$.value)) {
      refreshInterval$.next(refreshInterval);
    }
    if (
      creationOptions?.useUnifiedSearchIntegration &&
      timeRestore$.value &&
      refreshInterval &&
      !fastIsEqual(refreshInterval, timefilterService.getRefreshInterval())
    ) {
      timefilterService.setRefreshInterval(refreshInterval);
    }
  }
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
  function setTimeRange(timeRange: TimeRange | undefined) {
    if (!fastIsEqual(timeRange, timeRange$.value)) {
      timeRange$.next(timeRange);
    }
    if (
      creationOptions?.useUnifiedSearchIntegration &&
      timeRestore$.value &&
      timeRange &&
      !fastIsEqual(timeRange, timefilterService.getTime())
    ) {
      timefilterService.setTime(timeRange);
    }
  }
  const timeRestore$ = new BehaviorSubject<boolean | undefined>(
    initialState?.timeRestore ?? DEFAULT_DASHBOARD_INPUT.timeRestore
  );
  function setTimeRestore(timeRestore: boolean) {
    if (timeRestore !== timeRestore$.value) timeRestore$.next(timeRestore);
  }
  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(initialState.timeslice);
  const unifiedSearchFilters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  function setUnifiedSearchFilters(unifiedSearchFilters: Filter[] | undefined) {
    if (!fastIsEqual(unifiedSearchFilters, unifiedSearchFilters$.value)) {
      unifiedSearchFilters$.next(unifiedSearchFilters);
    }
    const filtersOrDefault = unifiedSearchFilters ?? [];
    if (
      creationOptions?.useUnifiedSearchIntegration &&
      !fastIsEqual(filtersOrDefault, filterManager.getFilters())
    ) {
      filterManager.setAppFilters(cloneDeep(filtersOrDefault));
    }
  }

  setQuery(initialState.query);
  setRefreshInterval(initialState.refreshInterval);
  setTimeRange(initialState.timeRange);
  setUnifiedSearchFilters(initialState.filters);

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
      setFilters: setUnifiedSearchFilters,
      setQuery,
      setTimeRange,
      timeRange$,
      timeslice$,
    },
    comparators: {
      filters: [unifiedSearchFilters$, setUnifiedSearchFilters, fastIsEqual],
      query: [query$, setQuery, fastIsEqual],
      refreshInterval: [
        refreshInterval$,
        setRefreshInterval,
        (a: RefreshInterval | undefined, b: RefreshInterval | undefined) =>
          timeRestore$.value ? fastIsEqual(a, b) : true,
      ],
      timeRange: [
        timeRange$,
        setTimeRange,
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
        setQuery(lastSavedState.query);
        setTimeRestore(lastSavedState.timeRestore);
        setUnifiedSearchFilters(lastSavedState.filters);
        if (lastSavedState.timeRestore) {
          setRefreshInterval(lastSavedState.refreshInterval);
          setTimeRange(lastSavedState.timeRange);
        }
      },
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
