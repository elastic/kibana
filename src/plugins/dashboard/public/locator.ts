/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { TimeRange, Filter, Query, QueryState, RefreshInterval } from '../../data/public';
import type { LocatorDefinition, LocatorPublic } from '../../share/public';
import type { SavedDashboardPanel } from '../common/types';
import { esFilters } from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';
import { ViewMode } from '../../embeddable/public';
import { DashboardConstants } from './dashboard_constants';

const cleanEmptyKeys = (stateObj: Record<string, unknown>) => {
  Object.keys(stateObj).forEach((key) => {
    if (stateObj[key] === undefined) {
      delete stateObj[key];
    }
  });
  return stateObj;
};

export const DASHBOARD_APP_LOCATOR = 'DASHBOARD_APP_LOCATOR';

export interface DashboardAppLocatorParams extends SerializableRecord {
  /**
   * If given, the dashboard saved object with this id will be loaded. If not given,
   * a new, unsaved dashboard will be loaded up.
   */
  dashboardId?: string;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

  /**
   * Optionally apply filers. NOTE: if given and used in conjunction with `dashboardId`, and the
   * saved dashboard has filters saved with it, this will _replace_ those filters.
   */
  filters?: Filter[];
  /**
   * Optionally set a query. NOTE: if given and used in conjunction with `dashboardId`, and the
   * saved dashboard has a query saved with it, this will _replace_ that query.
   */
  query?: Query;
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
   * View mode of the dashboard.
   */
  viewMode?: ViewMode;

  /**
   * Search search session ID to restore.
   * (Background search)
   */
  searchSessionId?: string;

  /**
   * List of dashboard panels
   */
  panels?: SavedDashboardPanel[] & SerializableRecord;

  /**
   * Saved query ID
   */
  savedQuery?: string;
}

export type DashboardAppLocator = LocatorPublic<DashboardAppLocatorParams>;

export interface DashboardAppLocatorDependencies {
  useHashedUrl: boolean;
  getDashboardFilterFields: (dashboardId: string) => Promise<Filter[]>;
}

export class DashboardAppLocatorDefinition implements LocatorDefinition<DashboardAppLocatorParams> {
  public readonly id = DASHBOARD_APP_LOCATOR;

  constructor(protected readonly deps: DashboardAppLocatorDependencies) {}

  public readonly getLocation = async (params: DashboardAppLocatorParams) => {
    const useHash = params.useHash ?? this.deps.useHashedUrl;
    const hash = params.dashboardId ? `view/${params.dashboardId}` : `create`;

    const getSavedFiltersFromDestinationDashboardIfNeeded = async (): Promise<Filter[]> => {
      if (params.preserveSavedFilters === false) return [];
      if (!params.dashboardId) return [];
      try {
        return await this.deps.getDashboardFilterFields(params.dashboardId);
      } catch (e) {
        // In case dashboard is missing, build the url without those filters.
        // The Dashboard app will handle redirect to landing page with a toast message.
        return [];
      }
    };

    // leave filters `undefined` if no filters was applied
    // in this case dashboard will restore saved filters on its own
    const filters = params.filters && [
      ...(await getSavedFiltersFromDestinationDashboardIfNeeded()),
      ...params.filters,
    ];

    let path = setStateToKbnUrl(
      '_a',
      cleanEmptyKeys({
        query: params.query,
        filters: filters?.filter((f) => !esFilters.isFilterPinned(f)),
        viewMode: params.viewMode,
        panels: params.panels,
        savedQuery: params.savedQuery,
      }),
      { useHash },
      `#/${hash}`
    );

    path = setStateToKbnUrl<QueryState>(
      '_g',
      cleanEmptyKeys({
        time: params.timeRange,
        filters: filters?.filter((f) => esFilters.isFilterPinned(f)),
        refreshInterval: params.refreshInterval,
      }),
      { useHash },
      path
    );

    if (params.searchSessionId) {
      path = `${path}&${DashboardConstants.SEARCH_SESSION_ID}=${params.searchSessionId}`;
    }

    return {
      app: DashboardConstants.DASHBOARDS_ID,
      path,
      state: {},
    };
  };
}
