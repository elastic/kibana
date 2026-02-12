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

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import { pinFilter } from '@kbn/es-query';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DashboardLocatorParams, DashboardLocatorParamsSerializable } from '../types';
import { DASHBOARD_APP_ID, SEARCH_SESSION_ID } from '../page_bundle_constants';

/**
 * Useful for ensuring that we don't pass any non-serializable values to history.push (for example, functions).
 */
const getSerializableRecord: <O>(o: O) => O & SerializableRecord = flow(JSON.stringify, JSON.parse);

/**
 * Removes keys with `undefined` values from a state object.
 * This mutates the original object and returns it.
 *
 * @param stateObj - The state object to clean.
 * @returns The same object with undefined keys removed.
 */
export const cleanEmptyKeys = (stateObj: Record<string, unknown>) => {
  Object.keys(stateObj).forEach((key) => {
    if (stateObj[key] === undefined) {
      delete stateObj[key];
    }
  });
  return stateObj;
};

export type DashboardAppLocator = LocatorPublic<DashboardLocatorParamsSerializable>;

export interface DashboardAppLocatorDependencies {
  useHashedUrl: boolean;
  getDashboardFilterFields: (dashboardId: string) => Promise<AsCodeFilter[]>;
}

export type ForwardedDashboardState = Omit<
  DashboardLocatorParams,
  'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'
>;

/**
 * Locator definition for the Dashboard application.
 * This class is responsible for generating URLs and navigation state for dashboard links.
 */
export class DashboardAppLocatorDefinition
  implements LocatorDefinition<DashboardLocatorParamsSerializable>
{
  /** The unique identifier for the dashboard app locator. */
  public readonly id = DASHBOARD_APP_LOCATOR;

  /**
   * Creates a new DashboardAppLocatorDefinition.
   *
   * @param deps - The dependencies required for the locator.
   */
  constructor(protected readonly deps: DashboardAppLocatorDependencies) {}

  /**
   * Generates the location for a dashboard based on the provided parameters.
   *
   * @param params - The {@link DashboardLocatorParams} to use for generating the location.
   * @returns A promise that resolves to the location object containing app, path, and state.
   */
  public readonly getLocation = async (params: DashboardLocatorParamsSerializable) => {
    const {
      filters,
      pinnedFilters,
      useHash: paramsUseHash,
      preserveSavedFilters,
      dashboardId,
      ...restParams
    } = params;
    const useHash = paramsUseHash ?? this.deps.useHashedUrl;

    const hash = dashboardId ? `view/${dashboardId}` : `create`;

    const getSavedFiltersFromDestinationDashboardIfNeeded = async (): Promise<AsCodeFilter[]> => {
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

    let path = `#/${hash}`;
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>(
      '_g',
      cleanEmptyKeys({
        time: params.time_range,
        filters: toStoredFilters(pinnedFilters)?.map((filter) => pinFilter(filter)),
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
  };
}
