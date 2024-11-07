/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COMPARE_ALL_OPTIONS, compareFilters, type Filter } from '@kbn/es-query';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  skip,
  startWith,
  switchMap,
} from 'rxjs';
import { PublishesFilters, PublishingSubject } from '@kbn/presentation-publishing';
import { DashboardContainer } from '../../dashboard_container';

export function startSyncingDashboardControlGroup(dashboard: DashboardContainer) {
  const controlGroupFilters$ = dashboard.controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.filters$ : of(undefined)))
  );
  const controlGroupTimeslice$ = dashboard.controlGroupApi$.pipe(
    switchMap((controlGroupApi) => (controlGroupApi ? controlGroupApi.timeslice$ : of(undefined)))
  );

  // --------------------------------------------------------------------------------------
  // dashboard.unifiedSearchFilters$
  // --------------------------------------------------------------------------------------
  const unifiedSearchFilters$ = new BehaviorSubject<Filter[] | undefined>(
    dashboard.getInput().filters
  );
  dashboard.unifiedSearchFilters$ = unifiedSearchFilters$ as PublishingSubject<
    Filter[] | undefined
  >;
  dashboard.publishingSubscription.add(
    dashboard
      .getInput$()
      .pipe(
        startWith(dashboard.getInput()),
        map((input) => input.filters),
        distinctUntilChanged((previous, current) => {
          return compareFilters(previous ?? [], current ?? [], COMPARE_ALL_OPTIONS);
        })
      )
      .subscribe((unifiedSearchFilters) => {
        unifiedSearchFilters$.next(unifiedSearchFilters);
      })
  );

  // --------------------------------------------------------------------------------------
  // Set dashboard.filters$ to include unified search filters and control group filters
  // --------------------------------------------------------------------------------------
  function getCombinedFilters() {
    return combineDashboardFiltersWithControlGroupFilters(
      dashboard.getInput().filters ?? [],
      dashboard.controlGroupApi$.value
    );
  }

  const filters$ = new BehaviorSubject<Filter[] | undefined>(getCombinedFilters());
  dashboard.filters$ = filters$;

  dashboard.publishingSubscription.add(
    combineLatest([dashboard.unifiedSearchFilters$, controlGroupFilters$]).subscribe(() => {
      filters$.next(getCombinedFilters());
    })
  );

  // --------------------------------------------------------------------------------------
  // when control group outputs filters, force a refresh!
  // --------------------------------------------------------------------------------------
  dashboard.publishingSubscription.add(
    controlGroupFilters$
      .pipe(
        skip(1) // skip first filter output because it will have been applied in initialize
      )
      .subscribe(() => dashboard.forceRefresh(false)) // we should not reload the control group when the control group output changes - otherwise, performance is severely impacted
  );

  // --------------------------------------------------------------------------------------
  // when control group outputs timeslice, dispatch timeslice
  // --------------------------------------------------------------------------------------
  dashboard.publishingSubscription.add(
    controlGroupTimeslice$.subscribe((timeslice) => {
      dashboard.dispatch.setTimeslice(timeslice);
    })
  );
}

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroupApi?: PublishesFilters
): Filter[] => {
  return [...dashboardFilters, ...(controlGroupApi?.filters$.value ?? [])];
};
