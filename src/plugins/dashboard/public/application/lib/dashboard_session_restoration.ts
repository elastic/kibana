/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';

import { createQueryParamObservable } from '@kbn/kibana-utils-plugin/public';
import type { Query } from '@kbn/es-query';
import {
  noSearchSessionStorageCapabilityMessage,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { getQueryParams } from '@kbn/kibana-utils-plugin/public';

import type { DashboardState } from '../../types';
import type { DashboardSavedObject } from '../../saved_dashboards';
import { DashboardAppLocatorParams, DashboardConstants } from '../..';
import { getDashboardTitle } from '../../dashboard_strings';
import { stateToRawDashboardState } from './convert_dashboard_state';
import { DASHBOARD_APP_LOCATOR } from '../../locator';
import { pluginServices } from '../../services/plugin_services';

export const getSearchSessionIdFromURL = (history: History): string | undefined =>
  getQueryParams(history.location)[DashboardConstants.SEARCH_SESSION_ID] as string | undefined;

export const getSessionURLObservable = (history: History) =>
  createQueryParamObservable<string>(history, DashboardConstants.SEARCH_SESSION_ID);

export function createSessionRestorationDataProvider(deps: {
  getAppState: () => DashboardState;
  getDashboardTitle: () => string;
  getDashboardId: () => string;
}): SearchSessionInfoProvider<DashboardAppLocatorParams> {
  return {
    getName: async () => deps.getDashboardTitle(),
    getLocatorData: async () => ({
      id: DASHBOARD_APP_LOCATOR,
      initialState: getLocatorParams({ ...deps, shouldRestoreSearchSession: false }),
      restoreState: getLocatorParams({ ...deps, shouldRestoreSearchSession: true }),
    }),
  };
}

/**
 * Enables dashboard search sessions.
 */
export function enableDashboardSearchSessions({
  canStoreSearchSession,
  initialDashboardState,
  getLatestDashboardState,
  savedDashboard,
}: {
  canStoreSearchSession: boolean;
  savedDashboard: DashboardSavedObject;
  initialDashboardState: DashboardState;
  getLatestDashboardState: () => DashboardState;
}) {
  const { data } = pluginServices.getServices();
  const dashboardTitle = getDashboardTitle(
    initialDashboardState.title,
    initialDashboardState.viewMode,
    !savedDashboard.id
  );

  data.search.session.enableStorage(
    createSessionRestorationDataProvider({
      getDashboardTitle: () => dashboardTitle,
      getDashboardId: () => savedDashboard?.id || '',
      getAppState: getLatestDashboardState,
    }),
    {
      isDisabled: () =>
        canStoreSearchSession
          ? { disabled: false }
          : {
              disabled: true,
              reasonText: noSearchSessionStorageCapabilityMessage,
            },
    }
  );
}

/**
 * Fetches the state to store when a session is saved so that this dashboard can be recreated exactly
 * as it was.
 */
function getLocatorParams({
  getAppState,
  getDashboardId,
  shouldRestoreSearchSession,
}: {
  getAppState: () => DashboardState;
  getDashboardId: () => string;
  shouldRestoreSearchSession: boolean;
}): DashboardAppLocatorParams {
  const { data } = pluginServices.getServices();

  const appState = stateToRawDashboardState({ state: getAppState() });
  const { filterManager, queryString } = data.query;
  const { timefilter } = data.query.timefilter;

  return {
    timeRange: shouldRestoreSearchSession ? timefilter.getAbsoluteTime() : timefilter.getTime(),
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    panels: getDashboardId() ? undefined : appState.panels,
    query: queryString.formatQuery(appState.query) as Query,
    filters: filterManager.getFilters(),
    savedQuery: appState.savedQuery,
    dashboardId: getDashboardId(),
    preserveSavedFilters: false,
    viewMode: appState.viewMode,
    useHash: false,
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
  };
}
