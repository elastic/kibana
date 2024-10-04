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
  // Control group subscriptions
  // --------------------------------------------------------------------------------------
  const controlGroupFilters$ = controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.filters$ : of(undefined)))
  );

  // Set filters$ to include unified search filters and control group filters
  const filtersSubscription = combineLatest([
    unifiedSearchFilters$,
    controlGroupFilters$,
  ]).subscribe(([unifiedSearchFilters, controlGroupFilters]) => {
    filters$.next([...(unifiedSearchFilters ?? []), ...(controlGroupFilters ?? [])]);
  });

  // when control group outputs filters, force a refresh!
  const controlGroupFiltersSubscription = controlGroupFilters$.subscribe(() =>
    panelsReload$.next()
  ); // we should not reload the control group when the control group output changes - otherwise, performance is severely impacted

  // when control group outputs timeslice, update timeslice
  const timesliceSubscription = controlGroupApi$
    .pipe(
      switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.timeslice$ : of(undefined)))
    )
    .subscribe((timeslice) => {
      if (timeslice !== timeslice$.value) timeslice$.next(timeslice);
    });

  // --------------------------------------------------------------------------------------
  // Set up unified search integration.
  // --------------------------------------------------------------------------------------
  let stopSyncingWithUnifiedSearch: (() => void) | undefined;
  if (
    creationOptions?.useUnifiedSearchIntegration &&
    creationOptions?.unifiedSearchSettings?.kbnUrlStateStorage
  ) {
    const {
      queryString,
      filterManager,
      timefilter: { timefilter: timefilterService },
    } = dataService.query;
    const { kbnUrlStateStorage } = creationOptions?.unifiedSearchSettings;

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
      kbnUrlStateStorage
    );

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
    };
  }

  return {
    api: {
      filters$,
      query$,
      refreshInterval$,
      timeRange$,
      timeslice$,
    },
    internalApi: {
      controlGroupReload$,
      panelsReload$,
    },
    cleanup: () => {
      controlGroupFiltersSubscription.unsubscribe();
      filtersSubscription.unsubscribe();
      stopSyncingWithUnifiedSearch?.();
      timesliceSubscription.unsubscribe();
    },
  };
}
