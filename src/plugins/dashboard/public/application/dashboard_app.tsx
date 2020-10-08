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

import { i18n } from '@kbn/i18n';
import React, { useEffect, useCallback } from 'react';

import _ from 'lodash';
import { DashboardStateManager } from './dashboard_state_manager';
import {
  createKbnUrlStateStorage,
  SavedObjectNotFound,
  withNotifyOnErrors,
} from '../../../kibana_utils/public';
import { DashboardAppProps, DashboardAppServices } from './types';
import { useKibana } from '../../../kibana_react/public';
import { DashboardSavedObject } from '../saved_dashboards';
import { migrateLegacyQuery } from './lib/migrate_legacy_query';
import { DashboardConstants } from '..';

enum UrlParams {
  SHOW_TOP_MENU = 'show-top-menu',
  SHOW_QUERY_INPUT = 'show-query-input',
  SHOW_TIME_FILTER = 'show-time-filter',
  SHOW_FILTER_BAR = 'show-filter-bar',
  HIDE_FILTER_BAR = 'hide-filter-bar',
}

interface UrlParamsSelectedMap {
  [UrlParams.SHOW_TOP_MENU]: boolean;
  [UrlParams.SHOW_QUERY_INPUT]: boolean;
  [UrlParams.SHOW_TIME_FILTER]: boolean;
  [UrlParams.SHOW_FILTER_BAR]: boolean;
}

// interface UrlParamValues extends Omit<UrlParamsSelectedMap, UrlParams.SHOW_FILTER_BAR> {
//   [UrlParams.HIDE_FILTER_BAR]: boolean;
// }

export function DashboardApp({ savedDashboardId, history }: DashboardAppProps) {
  const {
    core,
    chrome,
    // localStorage,
    // embeddable,
    data,
    uiSettings,
    // savedObjects,
    savedDashboards,
    initializerContext,
    // indexPatterns,
    // navigation,
    // dashboardCapabilities,
    // savedObjectsClient,
    dashboardConfig,
    // setHeaderActionMenu,
    // navigateToDefaultApp,
    // savedQueryService,
    // navigateToLegacyKibanaUrl,
    // addBasePath,
    // scopedHistory,
    // restorePreviousUrl,
    // embeddableCapabilities,
    usageCollection,
    // share,
  } = useKibana<DashboardAppServices>().services;

  const initializeStateSyncing = useCallback(
    (savedDashboard: DashboardSavedObject) => {
      const filterManager = data.query.filterManager;
      const queryStringManager = data.query.queryString;

      const kbnUrlStateStorage = createKbnUrlStateStorage({
        history,
        useHash: uiSettings.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(core.notifications.toasts),
      });

      const dashboardStateManager = new DashboardStateManager({
        savedDashboard,
        hideWriteControls: dashboardConfig.getHideWriteControls(),
        kibanaVersion: initializerContext.env.packageInfo.version,
        kbnUrlStateStorage,
        history,
        usageCollection,
      });

      // sync initial app filters from state to filterManager
      // if there is an existing similar global filter, then leave it as global
      filterManager.setAppFilters(_.cloneDeep(dashboardStateManager.appState.filters));
      queryStringManager.setQuery(migrateLegacyQuery(dashboardStateManager.appState.query));
    },
    [
      core.notifications.toasts,
      dashboardConfig,
      history,
      uiSettings,
      usageCollection,
      initializerContext.env,
      data.query,
    ]
  );

  // Dashboard loading useEffect
  useEffect(() => {
    data.indexPatterns
      .ensureDefaultIndexPattern()
      ?.then(() => savedDashboards.get(savedDashboardId) as Promise<DashboardSavedObject>)
      .then((savedDashboard) => {
        // if you've loaded an existing dashboard, add it to the recently accessed
        if (savedDashboardId) {
          chrome.recentlyAccessed.add(
            savedDashboard.getFullPath(),
            savedDashboard.title,
            savedDashboardId
          );
        }
        // console.log(savedDashboard);
      })
      .catch((error) => {
        // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
        // See https://github.com/elastic/kibana/issues/10951 for more context.
        if (error instanceof SavedObjectNotFound && savedDashboardId === 'create') {
          // Note preserve querystring part is necessary so the state is preserved through the redirect.

          // I am not sure that I need to do this anymore
          history.replace({
            ...history.location, // preserve query,
            pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          });
          core.notifications.toasts.addWarning(
            i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
              defaultMessage:
                'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
            })
          );
          return new Promise(() => {});
        } else {
          // E.g. a corrupt or deleted dashboard
          core.notifications.toasts.addDanger(error.message);
          history.push(DashboardConstants.LANDING_PAGE_PATH);
          return new Promise(() => {});
        }
      });
  }, [
    history,
    savedDashboards,
    savedDashboardId,
    data.indexPatterns,
    chrome.recentlyAccessed,
    core.notifications.toasts,
  ]);

  return <h1>This is the BRAND NEW DASHBOARD APP</h1>;
}
