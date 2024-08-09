/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Filter } from '@kbn/es-query';
import { BehaviorSubject, combineLatest, skip } from 'rxjs';
import { DashboardContainer } from '../../dashboard_container';
import { ControlGroupApi } from '@kbn/controls-plugin/public';

export function startSyncingDashboardControlGroup(dashboard: DashboardContainer, controlGroupApi: ControlGroupApi) {
  // when control group outputs filters, force a refresh!
  dashboard.integrationSubscriptions.add(
    controlGroupApi
      .filters$
      .pipe(
        skip(1) // skip first filter output because it will have been applied in initialize
      )
      .subscribe(() => dashboard.forceRefresh(false)) // we should not reload the control group when the control group output changes - otherwise, performance is severely impacted
  );

  dashboard.integrationSubscriptions.add(
    controlGroupApi
      .timeslice$
      .subscribe((timeslice) => {
        dashboard.dispatch.setTimeslice(timeslice);
      })
  );

  // --------------------------------------------------------------------------------------
  // Set dashboard.filters$ to include unified search filters and control group filters
  // --------------------------------------------------------------------------------------
  function getCombinedFilters() {
    return combineDashboardFiltersWithControlGroupFilters(
      dashboard.getInput().filters ?? [],
      controlGroupApi
    );
  }

  const filters$ = new BehaviorSubject<Filter[] | undefined>(getCombinedFilters());
  dashboard.filters$ = filters$;
  
  dashboard.integrationSubscriptions.add(
    combineLatest([dashboard.unifiedSearchFilters$, controlGroupApi.filters$]).subscribe(() => {
      filters$.next(getCombinedFilters());
    })
  );
}

export const combineDashboardFiltersWithControlGroupFilters = (
  dashboardFilters: Filter[],
  controlGroupApi?: ControlGroupApi
): Filter[] => {
  return [...dashboardFilters, ...(controlGroupApi?.filters$.value ?? [])];
};
