/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { flow } from 'lodash';

import type { Filter } from '@kbn/es-query';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DASHBOARD_APP_ID, SEARCH_SESSION_ID } from '../../dashboard_constants';
import { DashboardLocatorParams } from '../..';

/**
 * Useful for ensuring that we don't pass any non-serializable values to history.push (for example, functions).
 */
const getSerializableRecord: <O>(o: O) => O & SerializableRecord = flow(JSON.stringify, JSON.parse);

export const cleanEmptyKeys = (stateObj: Record<string, unknown>) => {
  Object.keys(stateObj).forEach((key) => {
    if (stateObj[key] === undefined) {
      delete stateObj[key];
    }
  });
  return stateObj;
};

export type DashboardAppLocator = LocatorPublic<DashboardLocatorParams>;

export interface DashboardAppLocatorDependencies {
  useHashedUrl: boolean;
  getDashboardFilterFields: (dashboardId: string) => Promise<Filter[]>;
}

export type ForwardedDashboardState = Omit<
  DashboardLocatorParams,
  'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'
>;

export class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardLocatorParams> {
  public readonly id = DASHBOARD_APP_LOCATOR;

  constructor(protected readonly deps: DashboardAppLocatorDependencies) {}

  public readonly getLocation = async (params: DashboardLocatorParams) => {
    const {
      filters,
      useHash: paramsUseHash,
      preserveSavedFilters,
      dashboardId,
      ...restParams
    } = params;
    const useHash = paramsUseHash ?? this.deps.useHashedUrl;

    const hash = dashboardId ? `view/${dashboardId}` : `create`;

    const getSavedFiltersFromDestinationDashboardIfNeeded = async (): Promise<Filter[]> => {
      if (preserveSavedFilters === false) return [];
      if (!params.dashboardId) return [];
      try {
        return await this.deps.getDashboardFilterFields(params.dashboardId);
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

    const { isFilterPinned } = await import('@kbn/es-query');

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
  };
}
