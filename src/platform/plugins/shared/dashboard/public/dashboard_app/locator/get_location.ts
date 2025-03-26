/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { isFilterPinned } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';
import { flow } from 'lodash';
import { cleanEmptyKeys, setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { DashboardLocatorParams } from '../../dashboard_api/types';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';
import { DASHBOARD_APP_ID, SEARCH_SESSION_ID } from '../../plugin_constants';
import type { ForwardedDashboardState } from './locator';

/**
 * Useful for ensuring that we don't pass any non-serializable values to history.push (for example, functions).
 */
const getSerializableRecord: <O>(o: O) => O & SerializableRecord = flow(JSON.stringify, JSON.parse);

export async function getLocation(useHashedUrl: boolean, params: DashboardLocatorParams) {
  const {
    filters,
    useHash: paramsUseHash,
    preserveSavedFilters,
    dashboardId,
    ...restParams
  } = params;
  const useHash = paramsUseHash ?? useHashedUrl;

  const hash = dashboardId ? `view/${dashboardId}` : `create`;

  const getSavedFiltersFromDestinationDashboardIfNeeded = async (): Promise<Filter[]> => {
    if (preserveSavedFilters === false) return [];
    if (!params.dashboardId) return [];
    try {
      return (
        (await getDashboardContentManagementService().loadDashboardState({ id: dashboardId }))
          .dashboardInput?.filters ?? []
      );
    } catch (e) {
      // In case dashboard is missing, build the url without those filters.
      // The Dashboard app will handle redirect to landing page with a toast message.
      return [];
    }
  };

  const state: ForwardedDashboardState = restParams;

  // leave filters `undefined` if no filters was applied
  // in this case dashboard will restore saved filters on its own
  state.filters = params.filters && [
    ...(await getSavedFiltersFromDestinationDashboardIfNeeded()),
    ...params.filters,
  ];

  let path = `#/${hash}`;
  path = setStateToKbnUrl<GlobalQueryStateFromUrl>(
    '_g',
    cleanEmptyKeys({
      time: params.timeRange,
      filters: filters?.filter((f) => isFilterPinned(f)),
      refreshInterval: params.refreshInterval,
    }),
    { useHash },
    path
  );

  if (params.searchSessionId) {
    path = `${path}&${SEARCH_SESSION_ID}=${params.searchSessionId}`;
  }

  return {
    app: DASHBOARD_APP_ID,
    path,
    state: getSerializableRecord(cleanEmptyKeys(state)),
  };
}
