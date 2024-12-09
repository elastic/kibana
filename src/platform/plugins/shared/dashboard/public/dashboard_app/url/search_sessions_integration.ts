/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import type { ViewMode } from '@kbn/embeddable-plugin/common';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { SEARCH_SESSION_ID } from '../../dashboard_constants';
import { DashboardLocatorParams } from '../../dashboard_container';
import { convertPanelMapToPanelsArray } from '../../../common';
import { dataService } from '../../services/kibana_services';
import { DashboardApi } from '../../dashboard_api/types';

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
  dashboardApi: DashboardApi
): SearchSessionInfoProvider<DashboardLocatorParams> {
  return {
    getName: async () =>
      dashboardApi.panelTitle.value ?? dashboardApi.savedObjectId.value ?? dashboardApi.uuid$.value,
    getLocatorData: async () => ({
      id: DASHBOARD_APP_LOCATOR,
      initialState: getLocatorParams({ dashboardApi, shouldRestoreSearchSession: false }),
      restoreState: getLocatorParams({ dashboardApi, shouldRestoreSearchSession: true }),
    }),
  };
}

/**
 * Fetches the state to store when a session is saved so that this dashboard can be recreated exactly
 * as it was.
 */
function getLocatorParams({
  dashboardApi,
  shouldRestoreSearchSession,
}: {
  dashboardApi: DashboardApi;
  shouldRestoreSearchSession: boolean;
}): DashboardLocatorParams {
  const savedObjectId = dashboardApi.savedObjectId.value;
  return {
    viewMode: (dashboardApi.viewMode.value as ViewMode) ?? 'view',
    useHash: false,
    preserveSavedFilters: false,
    filters: dataService.query.filterManager.getFilters(),
    query: dataService.query.queryString.formatQuery(dashboardApi.query$.value) as Query,
    dashboardId: savedObjectId,
    searchSessionId: shouldRestoreSearchSession
      ? dataService.search.session.getSessionId()
      : undefined,
    timeRange: shouldRestoreSearchSession
      ? dataService.query.timefilter.timefilter.getAbsoluteTime()
      : dataService.query.timefilter.timefilter.getTime(),
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
    panels: savedObjectId
      ? undefined
      : (convertPanelMapToPanelsArray(
          dashboardApi.panels$.value
        ) as DashboardLocatorParams['panels']),
  };
}
