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
        initialState: getUrlGeneratorState({ ...deps, shouldRestoreSearchSession: false }),
        restoreState: getUrlGeneratorState({ ...deps, shouldRestoreSearchSession: true }),
      };
    },
  };
}

function getUrlGeneratorState({
  data,
  getAppState,
  getDashboardId,
  shouldRestoreSearchSession,
}: {
  data: DataPublicPluginStart;
  getAppState: () => DashboardAppState;
  getDashboardId: () => string;
  shouldRestoreSearchSession: boolean;
}): DashboardUrlGeneratorState {
  const appState = getAppState();
  return {
    dashboardId: getDashboardId(),
    timeRange: shouldRestoreSearchSession
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    filters: data.query.filterManager.getFilters(),
    query: data.query.queryString.formatQuery(appState.query),
    savedQuery: appState.savedQuery,
    useHash: false,
    preserveSavedFilters: false,
    viewMode: appState.viewMode,
    panels: getDashboardId() ? undefined : appState.panels,
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
  };
}
