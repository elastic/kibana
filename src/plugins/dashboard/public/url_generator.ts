/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  TimeRange,
  Filter,
  Query,
  esFilters,
  QueryState,
  RefreshInterval,
} from '../../data/public';
import { setStateToKbnUrl } from '../../kibana_utils/public';
import { UrlGeneratorsDefinition } from '../../share/public';
import { SavedObjectLoader } from '../../saved_objects/public';
import { ViewMode } from '../../embeddable/public';
import { DashboardConstants } from './dashboard_constants';
import { SavedDashboardPanel } from '../common/types';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const DASHBOARD_APP_URL_GENERATOR = 'DASHBOARD_APP_URL_GENERATOR';

export interface DashboardUrlGeneratorState {
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
  refreshInterval?: RefreshInterval;

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
  panels?: SavedDashboardPanel[];

  /**
   * Saved query ID
   */
  savedQuery?: string;
}

export const createDashboardUrlGenerator = (
  getStartServices: () => Promise<{
    appBasePath: string;
    useHashedUrl: boolean;
    savedDashboardLoader: SavedObjectLoader;
  }>
): UrlGeneratorsDefinition<typeof DASHBOARD_APP_URL_GENERATOR> => ({
  id: DASHBOARD_APP_URL_GENERATOR,
  createUrl: async (state) => {
    const startServices = await getStartServices();
    const useHash = state.useHash ?? startServices.useHashedUrl;
    const appBasePath = startServices.appBasePath;
    const hash = state.dashboardId ? `view/${state.dashboardId}` : `create`;

    const getSavedFiltersFromDestinationDashboardIfNeeded = async (): Promise<Filter[]> => {
      if (state.preserveSavedFilters === false) return [];
      if (!state.dashboardId) return [];
      try {
        const dashboard = await startServices.savedDashboardLoader.get(state.dashboardId);
        return dashboard?.searchSource?.getField('filter') ?? [];
      } catch (e) {
        // in case dashboard is missing, built the url without those filters
        // dashboard app will handle redirect to landing page with toast message
        return [];
      }
    };

    const cleanEmptyKeys = (stateObj: Record<string, unknown>) => {
      Object.keys(stateObj).forEach((key) => {
        if (stateObj[key] === undefined) {
          delete stateObj[key];
        }
      });
      return stateObj;
    };

    // leave filters `undefined` if no filters was applied
    // in this case dashboard will restore saved filters on its own
    const filters = state.filters && [
      ...(await getSavedFiltersFromDestinationDashboardIfNeeded()),
      ...state.filters,
    ];

    let url = setStateToKbnUrl(
      STATE_STORAGE_KEY,
      cleanEmptyKeys({
        query: state.query,
        filters: filters?.filter((f) => !esFilters.isFilterPinned(f)),
        viewMode: state.viewMode,
        panels: state.panels,
        savedQuery: state.savedQuery,
      }),
      { useHash },
      `${appBasePath}#/${hash}`
    );

    url = setStateToKbnUrl<QueryState>(
      GLOBAL_STATE_STORAGE_KEY,
      cleanEmptyKeys({
        time: state.timeRange,
        filters: filters?.filter((f) => esFilters.isFilterPinned(f)),
        refreshInterval: state.refreshInterval,
      }),
      { useHash },
      url
    );

    if (state.searchSessionId) {
      url = `${url}&${DashboardConstants.SEARCH_SESSION_ID}=${state.searchSessionId}`;
    }

    return url;
  },
});
