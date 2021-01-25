/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
