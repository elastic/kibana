/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
import { UrlGeneratorsDefinition, UrlGeneratorState } from '../../share/public';
import { DashboardSavedFiltersHandling } from './types';
import { DashboardConstants } from './dashboard_constants';

export const STATE_STORAGE_KEY = '_a';
export const GLOBAL_STATE_STORAGE_KEY = '_g';

export const DASHBOARD_APP_URL_GENERATOR = 'DASHBOARD_APP_URL_GENERATOR';

export type DashboardAppLinkGeneratorState = UrlGeneratorState<{
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
   * When dashboard is loaded filters could come from 2 places:
   * 1. From url
   * 2. From dashboard's saved object
   *
   * Filters could be handled in 2 different ways:
   * * override - if there is state in the url, url is source of truth and filters from url take precedence over filters in saved object
   * * merge - filters from url are merged together with filters from saved object
   *
   * Url generator uses `merge` handling as default
   */
  savedFiltersHandling?: DashboardSavedFiltersHandling;
}>;

export const createDirectAccessDashboardLinkGenerator = (
  getStartServices: () => Promise<{ appBasePath: string; useHashedUrl: boolean }>
): UrlGeneratorsDefinition<typeof DASHBOARD_APP_URL_GENERATOR> => ({
  id: DASHBOARD_APP_URL_GENERATOR,
  createUrl: async state => {
    const startServices = await getStartServices();
    const useHash = state.useHash ?? startServices.useHashedUrl;
    const appBasePath = startServices.appBasePath;
    const hash = state.dashboardId ? `dashboard/${state.dashboardId}` : `dashboard`;

    const cleanEmptyKeys = (stateObj: Record<string, unknown>) => {
      Object.keys(stateObj).forEach(key => {
        if (stateObj[key] === undefined) {
          delete stateObj[key];
        }
      });
      return stateObj;
    };

    let resultUrl = setStateToKbnUrl(
      STATE_STORAGE_KEY,
      cleanEmptyKeys({
        query: state.query,
        filters: state.filters?.filter(f => !esFilters.isFilterPinned(f)),
      }),
      { useHash },
      `${appBasePath}#/${hash}`
    );

    resultUrl = setStateToKbnUrl<QueryState>(
      GLOBAL_STATE_STORAGE_KEY,
      cleanEmptyKeys({
        time: state.timeRange,
        filters: state.filters?.filter(f => esFilters.isFilterPinned(f)),
        refreshInterval: state.refreshInterval,
      }),
      { useHash },
      resultUrl
    );

    if (!state.savedFiltersHandling || state.savedFiltersHandling === 'merge') {
      resultUrl = `${resultUrl}&${DashboardConstants.SAVED_FILTERS_HANDLING_PARAM}=merge`;
    }

    return resultUrl;
  },
});
