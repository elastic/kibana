/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { ApplicationStart } from 'kibana/public';
import { QueryState, esFilters, DataPublicPluginStart } from '../../../../data/public';

import { setStateToKbnUrl } from '../../../../kibana_utils/public';
import { createDashboardEditUrl, DashboardConstants } from '../../dashboard_constants';

const GLOBAL_STATE_STORAGE_KEY = '_g';

export const getDashboardListItem = (
  application: ApplicationStart,
  queryService: DataPublicPluginStart['query'],
  useHash: boolean,
  id: string,
  timeRestore: boolean
) => {
  let url = application.getUrlForApp(DashboardConstants.DASHBOARDS_ID, {
    path: `#${createDashboardEditUrl(id)}`,
  });
  const queryState: QueryState = {};
  const timeRange = queryService.timefilter.timefilter.getTime();
  const filters = queryService.filterManager.getFilters();
  const refreshInterval = queryService.timefilter.timefilter.getRefreshInterval();
  if (filters && filters.length) {
    queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
  }
  // if time is not saved with the dashboard, add the time on the url query
  if (!timeRestore) {
    if (timeRange) queryState.time = timeRange;
    if (refreshInterval) queryState.refreshInterval = refreshInterval;
  }
  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
  return url;
};
