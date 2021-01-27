/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { History } from 'history';
import _ from 'lodash';
import { map } from 'rxjs/operators';

import { createKbnUrlStateStorage, withNotifyOnErrors } from '../../services/kibana_utils';
import { useKibana } from '../../services/kibana_react';
import {
  connectToQueryState,
  esFilters,
  noSearchSessionStorageCapabilityMessage,
  QueryState,
  syncQueryStateWithUrl,
} from '../../services/data';
import { SavedObject } from '../../services/saved_objects';
import type { TagDecoratedSavedObject } from '../../services/saved_objects_tagging_oss';

import { DashboardSavedObject } from '../../saved_dashboards';
import { migrateLegacyQuery } from '../lib/migrate_legacy_query';
import { createSessionRestorationDataProvider } from '../lib/session_restoration';
import { DashboardStateManager } from '../dashboard_state_manager';
import { getDashboardTitle } from '../../dashboard_strings';
import { DashboardAppServices } from '../types';
import { ViewMode } from '../../services/embeddable';

// TS is picky with type guards, we can't just inline `() => false`
function defaultTaggingGuard(_obj: SavedObject): _obj is TagDecoratedSavedObject {
  return false;
}

interface DashboardStateManagerReturn {
  dashboardStateManager: DashboardStateManager | null;
  viewMode: ViewMode | null;
  setViewMode: (value: ViewMode) => void;
}

export const useDashboardStateManager = (
  savedDashboard: DashboardSavedObject | null,
  history: History
): DashboardStateManagerReturn => {
  const {
    data: dataPlugin,
    core,
    uiSettings,
    usageCollection,
    initializerContext,
    dashboardCapabilities,
    savedObjectsTagging,
  } = useKibana<DashboardAppServices>().services;

  // Destructure and rename services; makes the Effect hook more specific, makes later
  // abstraction of service dependencies easier.
  const { query: queryService } = dataPlugin;
  const { session: searchSession } = dataPlugin.search;
  const { filterManager, queryString: queryStringManager } = queryService;
  const { timefilter } = queryService.timefilter;
  const { toasts } = core.notifications;
  const { hideWriteControls } = dashboardCapabilities;
  const { version: kibanaVersion } = initializerContext.env.packageInfo;

  const [dashboardStateManager, setDashboardStateManager] = useState<DashboardStateManager | null>(
    null
  );
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);

  const hasTaggingCapabilities = savedObjectsTagging?.ui.hasTagDecoration || defaultTaggingGuard;

  useEffect(() => {
    if (!savedDashboard) {
      return;
    }

    const kbnUrlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(toasts),
    });

    const stateManager = new DashboardStateManager({
      hasTaggingCapabilities,
      hideWriteControls,
      history,
      kbnUrlStateStorage,
      kibanaVersion,
      savedDashboard,
      usageCollection,
    });

    // sync initial app filters from state to filterManager
    // if there is an existing similar global filter, then leave it as global
    filterManager.setAppFilters(_.cloneDeep(stateManager.appState.filters));
    queryStringManager.setQuery(migrateLegacyQuery(stateManager.appState.query));

    // setup syncing of app filters between appState and filterManager
    const stopSyncingAppFilters = connectToQueryState(
      queryService,
      {
        set: ({ filters, query }) => {
          stateManager.setFilters(filters || []);
          stateManager.setQuery(query || queryStringManager.getDefaultQuery());
        },
        get: () => ({
          filters: stateManager.appState.filters,
          query: stateManager.getQuery(),
        }),
        state$: stateManager.appState$.pipe(
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
    stateManager.applyFilters(
      stateManager.getQuery() || queryStringManager.getDefaultQuery(),
      filterManager.getFilters()
    );

    // The hash check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (stateManager.getIsTimeSavedWithDashboard()) {
      const initialGlobalStateInUrl = kbnUrlStateStorage.get<QueryState>('_g');
      if (!initialGlobalStateInUrl?.time) {
        stateManager.syncTimefilterWithDashboardTime(timefilter);
      }
      if (!initialGlobalStateInUrl?.refreshInterval) {
        stateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
      }
    }

    // starts syncing `_g` portion of url with query services
    // it is important to start this syncing after `dashboardStateManager.syncTimefilterWithDashboard(timefilter);` above is run,
    // otherwise it will case redundant browser history records
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      queryService,
      kbnUrlStateStorage
    );

    // starts syncing `_a` portion of url
    stateManager.startStateSyncing();

    const dashboardTitle = getDashboardTitle(
      stateManager.getTitle(),
      stateManager.getViewMode(),
      stateManager.getIsDirty(timefilter),
      stateManager.isNew()
    );

    searchSession.enableStorage(
      createSessionRestorationDataProvider({
        data: dataPlugin,
        getDashboardTitle: () => dashboardTitle,
        getDashboardId: () => savedDashboard?.id || '',
        getAppState: () => stateManager.getAppState(),
      }),
      {
        isDisabled: () =>
          dashboardCapabilities.storeSearchSession
            ? { disabled: false }
            : {
                disabled: true,
                reasonText: noSearchSessionStorageCapabilityMessage,
              },
      }
    );

    setDashboardStateManager(stateManager);
    setViewMode(stateManager.getViewMode());

    return () => {
      stateManager?.destroy();
      setDashboardStateManager(null);
      stopSyncingAppFilters();
      stopSyncingQueryServiceStateWithUrl();
    };
  }, [
    dataPlugin,
    filterManager,
    hasTaggingCapabilities,
    hideWriteControls,
    history,
    kibanaVersion,
    queryService,
    queryStringManager,
    savedDashboard,
    searchSession,
    timefilter,
    toasts,
    uiSettings,
    usageCollection,
    dashboardCapabilities.storeSearchSession,
  ]);

  return { dashboardStateManager, viewMode, setViewMode };
};
