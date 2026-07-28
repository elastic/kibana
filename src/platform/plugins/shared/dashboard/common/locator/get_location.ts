/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { flow } from 'lodash';
import type { Filter } from '@kbn/es-query';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';

import type { DashboardLocatorParams } from '../types';
import { DASHBOARD_APP_ID, SEARCH_SESSION_ID } from '../page_bundle_constants';
import { cleanEmptyKeys } from '../clean_empty_keys';

type ForwardedDashboardState = Omit<
  DashboardLocatorParams,
  'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'
>;

/**
 * Useful for ensuring that we don't pass any non-serializable values to history.push (for example, functions).
 */
const getSerializableRecord: <O>(o: O) => O & SerializableRecord = flow(JSON.stringify, JSON.parse);

/**
 * Generates the location for a dashboard based on the provided parameters.
 *
 * @param params - The {@link DashboardLocatorParams} to use for generating the location.
 * @returns A promise that resolves to the location object containing app, path, and state.
 */
export async function getLocation(
  params: DashboardLocatorParams,
  useHashedUrl: boolean,
  getDashboardFilters: (dashboardId: string) => Promise<Filter[]>
) {
  const {
    filters,
    useHash: paramsUseHash,
    preserveSavedFilters,
    dashboardId,
    ...restParams
  } = params;
  const useHash = paramsUseHash ?? useHashedUrl;

  const hash = dashboardId ? `view/${dashboardId}` : `create`;

  const getDashboardFiltersIfNeeded = async (): Promise<Filter[]> => {
    if (preserveSavedFilters === false) return [];
    if (!params.dashboardId) return [];
    try {
      return await getDashboardFilters(params.dashboardId);
    } catch (e) {
      // In case dashboard is missing, build the url without those filters.
      // The Dashboard app will handle redirect to landing page with a toast message.
      return [];
    }
  };

  const state: ForwardedDashboardState = restParams;

  // leave filters `undefined` if no filters was applied
  // in this case dashboard will restore saved filters on its own
  state.filters = params.filters && [...(await getDashboardFiltersIfNeeded()), ...params.filters];

  const { isFilterPinned } = await import('@kbn/es-query');

  let path = `#/${hash}`;
  path = setStateToKbnUrl<GlobalQueryStateFromUrl>(
    '_g',
    cleanEmptyKeys({
      time: params.time_range,
      filters: filters?.filter((f) => isFilterPinned(f)),
      refreshInterval: params.refresh_interval,
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
