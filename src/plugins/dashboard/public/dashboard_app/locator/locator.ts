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
import { SerializableControlGroupInput } from '@kbn/controls-plugin/common';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';

import { DASHBOARD_APP_ID, SEARCH_SESSION_ID } from '../../dashboard_constants';
import type { DashboardContainerByValueInput, SavedDashboardPanel } from '../../../common';

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

export const DASHBOARD_APP_LOCATOR = 'DASHBOARD_APP_LOCATOR';

export type DashboardAppLocatorParams = Partial<
  Omit<
    DashboardContainerByValueInput,
    'panels' | 'controlGroupInput' | 'executionContext' | 'isEmbeddedExternally'
  >
> & {
  /**
   * If given, the dashboard saved object with this id will be loaded. If not given,
   * a new, unsaved dashboard will be loaded up.
   */
  dashboardId?: string;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * When `true` filters from saved filters from destination dashboard as merged with applied filters
   * When `false` applied filters take precedence and override saved filters
   *
   * true is default
   */
  preserveSavedFilters?: boolean;

  /**
   * Search search session ID to restore.
   * (Background search)
   */
  searchSessionId?: string;

  /**
   * List of dashboard panels
   */
  panels?: Array<SavedDashboardPanel & SerializableRecord>; // used SerializableRecord here to force the GridData type to be read as serializable

  /**
   * Control group input
   */
  controlGroupInput?: SerializableControlGroupInput;
};

export type DashboardAppLocator = LocatorPublic<DashboardAppLocatorParams>;

export interface DashboardAppLocatorDependencies {
  useHashedUrl: boolean;
  getDashboardFilterFields: (dashboardId: string) => Promise<Filter[]>;
}

export type ForwardedDashboardState = Omit<
  DashboardAppLocatorParams,
  'dashboardId' | 'preserveSavedFilters' | 'useHash' | 'searchSessionId'
>;

export class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardAppLocatorParams> {
  public readonly id = DASHBOARD_APP_LOCATOR;

  constructor(protected readonly deps: DashboardAppLocatorDependencies) {}

  public readonly getLocation = async (params: DashboardAppLocatorParams) => {
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
