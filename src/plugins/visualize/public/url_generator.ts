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
import { UrlGeneratorsDefinition } from '../../share/public';

const STATE_STORAGE_KEY = '_a';
const GLOBAL_STATE_STORAGE_KEY = '_g';

export const VISUALIZE_APP_URL_GENERATOR = 'VISUALIZE_APP_URL_GENERATOR';

export interface VisualizeUrlGeneratorState {
  /**
   * If given, it will load the given visualization else will load the create a new visualization page.
   */
  visualizationId?: string;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optional set indexPatternId.
   */
  indexPatternId?: string;

  /**
   * Optional set visualization type.
   */
  type?: string;

  /**
   * Optionally set the visualization.
   */
  vis?: unknown;

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
  hash?: boolean;
}

export const createVisualizeUrlGenerator = (
  getStartServices: () => Promise<{
    appBasePath: string;
    useHashedUrl: boolean;
  }>
): UrlGeneratorsDefinition<typeof VISUALIZE_APP_URL_GENERATOR> => ({
  id: VISUALIZE_APP_URL_GENERATOR,
  createUrl: async ({
    visualizationId,
    filters,
    indexPatternId,
    query,
    refreshInterval,
    vis,
    type,
    timeRange,
    hash,
  }: VisualizeUrlGeneratorState): Promise<string> => {
    const startServices = await getStartServices();
    const useHash = hash ?? startServices.useHashedUrl;
    const appBasePath = startServices.appBasePath;
    const mode = visualizationId ? `edit/${visualizationId}` : `create`;

    const appState: {
      query?: Query;
      filters?: Filter[];
      vis?: unknown;
    } = {};
    const queryState: QueryState = {};

    if (query) appState.query = query;
    if (filters && filters.length)
      appState.filters = filters?.filter((f) => !esFilters.isFilterPinned(f));
    if (vis) appState.vis = vis;

    if (timeRange) queryState.time = timeRange;
    if (filters && filters.length)
      queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
    if (refreshInterval) queryState.refreshInterval = refreshInterval;

    let url = `${appBasePath}#/${mode}`;
    url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
    url = setStateToKbnUrl(STATE_STORAGE_KEY, appState, { useHash }, url);

    if (indexPatternId) {
      url = `${url}&indexPattern=${indexPatternId}`;
    }

    if (type) {
      url = `${url}&type=${type}`;
    }

    return url;
  },
});
