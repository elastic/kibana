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

import { DASHBOARD_APP_URL_GENERATOR, DashboardUrlGeneratorState } from '../../url_generator';
import { DataPublicPluginStart } from '../../services/data';
import { DashboardAppState } from '../../types';

export function createSessionRestorationDataProvider(deps: {
  data: DataPublicPluginStart;
  getAppState: () => DashboardAppState;
  getDashboardTitle: () => string;
  getDashboardId: () => string;
}) {
  return {
    getName: async () => deps.getDashboardTitle(),
    getUrlGeneratorData: async () => {
      return {
        urlGeneratorId: DASHBOARD_APP_URL_GENERATOR,
        initialState: getUrlGeneratorState({ ...deps, forceAbsoluteTime: false }),
        restoreState: getUrlGeneratorState({ ...deps, forceAbsoluteTime: true }),
      };
    },
  };
}

function getUrlGeneratorState({
  data,
  getAppState,
  getDashboardId,
  forceAbsoluteTime,
}: {
  data: DataPublicPluginStart;
  getAppState: () => DashboardAppState;
  getDashboardId: () => string;
  /**
   * Can force time range from time filter to convert from relative to absolute time range
   */
  forceAbsoluteTime: boolean;
}): DashboardUrlGeneratorState {
  const appState = getAppState();
  return {
    dashboardId: getDashboardId(),
    timeRange: forceAbsoluteTime
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    filters: data.query.filterManager.getFilters(),
    query: data.query.queryString.formatQuery(appState.query),
    savedQuery: appState.savedQuery,
    useHash: false,
    preserveSavedFilters: false,
    viewMode: appState.viewMode,
    panels: getDashboardId() ? undefined : appState.panels,
    searchSessionId: data.search.session.getSessionId(),
  };
}
