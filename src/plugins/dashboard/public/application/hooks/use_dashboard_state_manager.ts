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

import _ from 'lodash';
import { History } from 'history';
import { map } from 'rxjs/operators';
import { useEffect, useState } from 'react';
import { DashboardSavedObject } from '../..';
import { DashboardAppServices } from '../types';
import { SavedObject } from '../../../../saved_objects/public';
import { migrateLegacyQuery } from '../lib/migrate_legacy_query';
import { DashboardStateManager } from '../dashboard_state_manager';
import type { TagDecoratedSavedObject } from '../../../../saved_objects_tagging_oss/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '../../../../kibana_utils/public';
import {
  connectToQueryState,
  esFilters,
  QueryState,
  syncQueryStateWithUrl,
} from '../../../../data/public';

export function useDashboardStateManager(
  services: DashboardAppServices,
  history: History,
  savedDashboard?: DashboardSavedObject
) {
  const [dashboardStateManager, setDashboardStateManager] = useState<DashboardStateManager>();

  useEffect(() => {
    if (!savedDashboard) {
      return;
    }

    const {
      uiSettings,
      usageCollection,
      data: { query },
      initializerContext,
      savedObjectsTagging,
      dashboardCapabilities,
      core: { notifications },
    } = services;

    const filterManager = query.filterManager;
    const timefilter = query.timefilter.timefilter;
    const queryStringManager = query.queryString;

    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(notifications.toasts),
    });

    // TS is picky with type guards, we can't just inline `() => false`
    function defaultTaggingGuard(obj: SavedObject): obj is TagDecoratedSavedObject {
      return false;
    }

    const newStateManager = new DashboardStateManager({
      hasTaggingCapabilities: savedObjectsTagging?.ui.hasTagDecoration ?? defaultTaggingGuard,
      hideWriteControls: dashboardCapabilities.hideWriteControls,
      kibanaVersion: initializerContext.env.packageInfo.version,
      kbnUrlStateStorage,
      usageCollection,
      savedDashboard,
      history,
    });

    // sync initial app filters from state to filterManager
    // if there is an existing similar global filter, then leave it as global
    filterManager.setAppFilters(_.cloneDeep(newStateManager.appState.filters));
    queryStringManager.setQuery(migrateLegacyQuery(newStateManager.appState.query));

    // setup syncing of app filters between appState and filterManager
    const stopSyncingAppFilters = connectToQueryState(
      query,
      {
        set: ({ filters, query: newQuery }) => {
          newStateManager.setFilters(filters || []);
          newStateManager.setQuery(newQuery || queryStringManager.getDefaultQuery());
        },
        get: () => ({
          filters: newStateManager.appState.filters,
          query: newStateManager.getQuery(),
        }),
        state$: newStateManager.appState$.pipe(
          map((appState) => ({
            filters: appState.filters,
            query: queryStringManager.formatQuery(appState.query),
          }))
        ),
      },
      {
        filters: esFilters.FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // Apply initial filters to Dashboard State Manager
    newStateManager.applyFilters(
      newStateManager.getQuery() || queryStringManager.getDefaultQuery(),
      filterManager.getFilters()
    );

    // The hash check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (newStateManager.getIsTimeSavedWithDashboard()) {
      const initialGlobalStateInUrl = kbnUrlStateStorage.get<QueryState>('_g');
      if (!initialGlobalStateInUrl?.time) {
        newStateManager.syncTimefilterWithDashboardTime(timefilter);
      }
      if (!initialGlobalStateInUrl?.refreshInterval) {
        newStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
      }
    }

    // starts syncing `_g` portion of url with query services
    // it is important to start this syncing after `dashboardStateManager.syncTimefilterWithDashboard(timefilter);` above is run,
    // otherwise it will case redundant browser history records
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      query,
      kbnUrlStateStorage
    );

    // starts syncing `_a` portion of url
    newStateManager.startStateSyncing();
    setDashboardStateManager(newStateManager);

    return () => {
      setDashboardStateManager((currentStateManager) => {
        currentStateManager?.destroy();
        return undefined;
      });
      stopSyncingAppFilters();
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [savedDashboard, history, services]);

  return dashboardStateManager;
}
