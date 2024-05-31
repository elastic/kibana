/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map } from 'rxjs';
import { History } from 'history';

import {
  getQueryParams,
  IKbnUrlStateStorage,
  createQueryParamObservable,
} from '@kbn/kibana-utils-plugin/public';
import { replaceUrlHashQuery } from '@kbn/kibana-utils-plugin/common';
import type { Query } from '@kbn/es-query';
import { SearchSessionInfoProvider } from '@kbn/data-plugin/public';

import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { SEARCH_SESSION_ID } from '../../dashboard_constants';
import { DashboardContainer, DashboardLocatorParams } from '../../dashboard_container';
import { convertPanelMapToSavedPanels } from '../../../common';
import { pluginServices } from '../../services/plugin_services';

export const removeSearchSessionIdFromURL = (kbnUrlStateStorage: IKbnUrlStateStorage) => {
  kbnUrlStateStorage.kbnUrlControls.updateAsync((nextUrl) => {
    if (nextUrl.includes(SEARCH_SESSION_ID)) {
      return replaceUrlHashQuery(nextUrl, (hashQuery) => {
        delete hashQuery[SEARCH_SESSION_ID];
        return hashQuery;
      });
    }
    return nextUrl;
  });
};

export const getSearchSessionIdFromURL = (history: History): string | undefined =>
  getQueryParams(history.location)[SEARCH_SESSION_ID] as string | undefined;

export const getSessionURLObservable = (history: History) =>
  createQueryParamObservable<string>(history, SEARCH_SESSION_ID).pipe(
    map((sessionId) => sessionId ?? undefined)
  );

export function createSessionRestorationDataProvider(
  container: DashboardContainer
): SearchSessionInfoProvider<DashboardLocatorParams> {
  return {
    getName: async () => container.getTitle(),
    getLocatorData: async () => ({
      id: DASHBOARD_APP_LOCATOR,
      initialState: getLocatorParams({ container, shouldRestoreSearchSession: false }),
      restoreState: getLocatorParams({ container, shouldRestoreSearchSession: true }),
    }),
  };
}

/**
 * Fetches the state to store when a session is saved so that this dashboard can be recreated exactly
 * as it was.
 */
function getLocatorParams({
  container,
  shouldRestoreSearchSession,
}: {
  container: DashboardContainer;
  shouldRestoreSearchSession: boolean;
}): DashboardLocatorParams {
  const {
    data: {
      query: {
        queryString,
        filterManager,
        timefilter: { timefilter },
      },
      search: { session },
    },
  } = pluginServices.getServices();

  const {
    componentState: { lastSavedId },
    explicitInput: { panels, query, viewMode },
  } = container.getState();

  return {
    viewMode,
    useHash: false,
    preserveSavedFilters: false,
    filters: filterManager.getFilters(),
    query: queryString.formatQuery(query) as Query,
    dashboardId: container.getDashboardSavedObjectId(),
    searchSessionId: shouldRestoreSearchSession ? session.getSessionId() : undefined,
    timeRange: shouldRestoreSearchSession ? timefilter.getAbsoluteTime() : timefilter.getTime(),
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
    panels: lastSavedId
      ? undefined
      : (convertPanelMapToSavedPanels(panels) as DashboardLocatorParams['panels']),
  };
}
