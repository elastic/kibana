/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabbedContentState } from '@kbn/unified-tabs/src/components/tabbed_content/tabbed_content';
import { cloneDeep, differenceBy, omit, pick } from 'lodash';
import type { QueryState } from '@kbn/data-plugin/common';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import { createDataSource } from '../../../../../../common/data_sources/utils';
import type { TabState } from '../types';
import { selectAllTabs, selectRecentlyClosedTabs, selectTab } from '../selectors';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  createTabRuntimeState,
  selectTabRuntimeState,
  selectTabRuntimeAppState,
  selectInitialUnifiedHistogramLayoutPropsMap,
  selectTabRuntimeInternalState,
} from '../runtime_state';
import {
  APP_STATE_URL_KEY,
  GLOBAL_STATE_URL_KEY,
  NEW_TAB_ID,
} from '../../../../../../common/constants';
import type { DiscoverAppState } from '../../discover_app_state_container';
import { createInternalStateAsyncThunk, createTabItem } from '../utils';
import { setBreadcrumbs } from '../../../../../utils/breadcrumbs';
import { DEFAULT_TAB_STATE } from '../constants';
import { TABS_ENABLED_FEATURE_FLAG_KEY } from '../../../../../constants';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> =
  (params) =>
  (
    dispatch,
    getState,
    { runtimeStateManager, tabsStorageManager, services: { profilesManager, ebtManager } }
  ) => {
    const previousState = getState();
    const previousTabs = selectAllTabs(previousState);
    const removedTabs = differenceBy(previousTabs, params.allTabs, differenceIterateeByTabId);
    const addedTabs = differenceBy(params.allTabs, previousTabs, differenceIterateeByTabId);

    for (const tab of removedTabs) {
      dispatch(disconnectTab({ tabId: tab.id }));
      delete runtimeStateManager.tabs.byId[tab.id];
    }

    for (const tab of addedTabs) {
      runtimeStateManager.tabs.byId[tab.id] = createTabRuntimeState({
        profilesManager,
        ebtManager,
        initialValues: {
          unifiedHistogramLayoutPropsMap: tab.duplicatedFromId
            ? selectInitialUnifiedHistogramLayoutPropsMap(runtimeStateManager, tab.duplicatedFromId)
            : undefined,
        },
      });
    }

    const selectedTabRuntimeState = selectTabRuntimeState(
      runtimeStateManager,
      params.selectedTabId
    );

    if (selectedTabRuntimeState) {
      selectedTabRuntimeState.scopedEbtManager$.getValue().setAsActiveManager();
    }

    dispatch(
      internalStateSlice.actions.setTabs({
        ...params,
        recentlyClosedTabs: tabsStorageManager.getNRecentlyClosedTabs(
          // clean up the recently closed tabs if the same ids are present in next open tabs
          differenceBy(params.recentlyClosedTabs, params.allTabs, differenceIterateeByTabId),
          removedTabs
        ),
      })
    );
  };

export const updateTabs: InternalStateThunkActionCreator<[TabbedContentState], Promise<void>> =
  ({ items, selectedItem }) =>
  async (dispatch, getState, { services, runtimeStateManager, urlStateStorage }) => {
    const currentState = getState();
    const currentTab = selectTab(currentState, currentState.tabs.unsafeCurrentId);
    const currentTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTab.id);
    const currentTabStateContainer = currentTabRuntimeState.stateContainer$.getValue();

    const updatedTabs = items.map<TabState>((item) => {
      const existingTab = selectTab(currentState, item.id);

      const tab: TabState = {
        ...DEFAULT_TAB_STATE,
        ...{
          globalState: {
            timeRange: services.timefilter.getTime(),
            refreshInterval: services.timefilter.getRefreshInterval(),
            filters: services.filterManager.getGlobalFilters(),
          },
        },
        ...existingTab,
        ...pick(item, 'id', 'label', 'duplicatedFromId'),
      };

      if (!existingTab) {
        tab.initialAppState =
          'initialAppState' in item
            ? cloneDeep(item.initialAppState as TabState['initialAppState'])
            : tab.initialAppState;

        tab.globalState =
          'globalState' in item
            ? cloneDeep(item.globalState as TabState['globalState'])
            : tab.globalState;

        tab.dataRequestParams =
          'dataRequestParams' in item
            ? (item.dataRequestParams as TabState['dataRequestParams'])
            : tab.dataRequestParams;

        if (item.duplicatedFromId) {
          // the new tab was created by duplicating an existing tab
          const existingTabToDuplicateFrom = selectTab(currentState, item.duplicatedFromId);

          if (!existingTabToDuplicateFrom) {
            return tab;
          }

          tab.initialInternalState =
            selectTabRuntimeInternalState(runtimeStateManager, item.duplicatedFromId) ??
            cloneDeep(existingTabToDuplicateFrom.initialInternalState);
          tab.initialAppState =
            selectTabRuntimeAppState(runtimeStateManager, item.duplicatedFromId) ??
            cloneDeep(existingTabToDuplicateFrom.initialAppState);
          tab.globalState = cloneDeep(existingTabToDuplicateFrom.globalState);
          tab.uiState = cloneDeep(existingTabToDuplicateFrom.uiState);
        } else {
          // the new tab is a fresh one
          const currentQuery = selectTabRuntimeAppState(runtimeStateManager, currentTab.id)?.query;
          const currentDataView = currentTabRuntimeState.currentDataView$.getValue();

          if (!currentQuery || !currentDataView) {
            return tab;
          }

          const isCurrentModeESQL = isOfAggregateQueryType(currentQuery);

          tab.initialAppState = {
            query: isCurrentModeESQL
              ? { esql: getInitialESQLQuery(currentDataView, true) }
              : undefined,
            dataSource: createDataSource({
              dataView: currentDataView,
              query: currentQuery,
            }),
          };
        }
      }

      return tab;
    });

    if (selectedItem?.id !== currentTab.id) {
      currentTabStateContainer?.actions.stopSyncing();

      const nextTab = selectedItem ? selectTab(currentState, selectedItem.id) : undefined;
      const nextTabRuntimeState = selectedItem
        ? selectTabRuntimeState(runtimeStateManager, selectedItem.id)
        : undefined;
      const nextTabStateContainer = nextTabRuntimeState?.stateContainer$.getValue();

      if (nextTab && nextTabStateContainer) {
        const { timeRange, refreshInterval, filters: globalFilters } = nextTab.globalState;
        const appState = nextTabStateContainer.appState.getState();
        const { filters: appFilters, query } = appState;

        await urlStateStorage.set<QueryState>(GLOBAL_STATE_URL_KEY, {
          time: timeRange,
          refreshInterval,
          filters: globalFilters,
        });
        await urlStateStorage.set<DiscoverAppState>(APP_STATE_URL_KEY, appState);

        services.timefilter.setTime(timeRange ?? services.timefilter.getTimeDefaults());
        services.timefilter.setRefreshInterval(
          refreshInterval ?? services.timefilter.getRefreshIntervalDefaults()
        );
        services.filterManager.setGlobalFilters(cloneDeep(globalFilters ?? []));
        services.filterManager.setAppFilters(cloneDeep(appFilters ?? []));
        services.data.query.queryString.setQuery(
          query ?? services.data.query.queryString.getDefaultQuery()
        );

        nextTabStateContainer.actions.initializeAndSync();
      } else {
        await urlStateStorage.set(GLOBAL_STATE_URL_KEY, null);
        await urlStateStorage.set(APP_STATE_URL_KEY, null);
      }

      dispatch(internalStateSlice.actions.discardFlyoutsOnTabChange());
    }

    dispatch(
      setTabs({
        allTabs: updatedTabs,
        selectedTabId: selectedItem?.id ?? currentTab.id,
        recentlyClosedTabs: selectRecentlyClosedTabs(currentState),
      })
    );
  };

export const initializeTabs = createInternalStateAsyncThunk(
  'internalState/initializeTabs',
  async (
    {
      discoverSessionId,
      shouldClearAllTabs,
    }: { discoverSessionId: string | undefined; shouldClearAllTabs?: boolean },
    { dispatch, getState, extra: { services, tabsStorageManager, customizationContext } }
  ) => {
    const tabsEnabled = services.core.featureFlags.getBooleanValue(
      TABS_ENABLED_FEATURE_FLAG_KEY,
      false
    );

    if (tabsEnabled && shouldClearAllTabs) {
      dispatch(clearAllTabs());
    }

    const { userId: existingUserId, spaceId: existingSpaceId } = getState();

    const getUserId = async () => {
      try {
        return (await services.core.security?.authc.getCurrentUser()).profile_uid ?? '';
      } catch {
        // ignore as user id might be unavailable for some deployments
        return '';
      }
    };

    const getSpaceId = async () => {
      try {
        return (await services.spaces?.getActiveSpace())?.id ?? '';
      } catch {
        // ignore
        return '';
      }
    };

    const [userId, spaceId, persistedDiscoverSession] = await Promise.all([
      existingUserId === undefined ? getUserId() : existingUserId,
      existingSpaceId === undefined ? getSpaceId() : existingSpaceId,
      discoverSessionId ? services.savedSearch.getDiscoverSession(discoverSessionId) : undefined,
    ]);

    if (customizationContext.displayMode === 'standalone' && persistedDiscoverSession) {
      services.chrome.recentlyAccessed.add(
        getSavedSearchFullPathUrl(persistedDiscoverSession.id),
        persistedDiscoverSession.title ??
          i18n.translate('discover.defaultDiscoverSessionTitle', {
            defaultMessage: 'Untitled Discover session',
          }),
        persistedDiscoverSession.id
      );

      setBreadcrumbs({ services, titleBreadcrumbText: persistedDiscoverSession.title });
    }

    const initialTabsState = tabsStorageManager.loadLocally({
      userId,
      spaceId,
      persistedDiscoverSession,
      defaultTabState: DEFAULT_TAB_STATE,
    });

    dispatch(setTabs(initialTabsState));

    return { userId, spaceId, persistedDiscoverSession };
  }
);

export const clearAllTabs: InternalStateThunkActionCreator = () => (dispatch) => {
  const defaultTab: TabState = {
    ...DEFAULT_TAB_STATE,
    ...createTabItem([]),
  };

  return dispatch(updateTabs({ items: [defaultTab], selectedItem: defaultTab }));
};

export const restoreTab: InternalStateThunkActionCreator<[{ restoreTabId: string }]> =
  ({ restoreTabId }) =>
  (dispatch, getState) => {
    const currentState = getState();

    // Restoring the 'new' tab ID is a no-op because it represents a placeholder for creating new tabs,
    // not an actual tab that can be restored.
    if (restoreTabId === currentState.tabs.unsafeCurrentId || restoreTabId === NEW_TAB_ID) {
      return;
    }

    const currentTabs = selectAllTabs(currentState);
    const currentTab = selectTab(currentState, currentState.tabs.unsafeCurrentId);

    let items = currentTabs;
    // search among open tabs
    let selectedItem = items.find((tab) => tab.id === restoreTabId);

    if (!selectedItem) {
      // search among recently closed tabs
      const recentlyClosedTabs = selectRecentlyClosedTabs(currentState);
      const closedTab = recentlyClosedTabs.find((tab) => tab.id === restoreTabId);
      if (closedTab) {
        // reopening one of the closed tabs
        selectedItem = omit(closedTab, 'closedAt');
        items = [...items, closedTab];
      }
    }

    return dispatch(
      updateTabs({
        items,
        selectedItem: selectedItem || currentTab,
      })
    );
  };

export const openInNewTab: InternalStateThunkActionCreator<
  [
    {
      tabLabel?: string;
      appState?: TabState['initialAppState'];
      globalState?: TabState['globalState'];
      searchSessionId?: string;
    }
  ]
> =
  ({ tabLabel, appState, globalState, searchSessionId }) =>
  (dispatch, getState) => {
    const initialAppState = appState ? cloneDeep(appState) : undefined;
    const initialGlobalState = globalState ? cloneDeep(globalState) : {};
    const currentState = getState();
    const currentTabs = selectAllTabs(currentState);

    const newDefaultTab: TabState = {
      ...DEFAULT_TAB_STATE,
      ...createTabItem(currentTabs),
      initialAppState,
      globalState: initialGlobalState,
    };

    if (tabLabel) {
      newDefaultTab.label = tabLabel;
    }

    if (searchSessionId) {
      newDefaultTab.dataRequestParams = {
        ...newDefaultTab.dataRequestParams,
        searchSessionId,
      };
    }

    return dispatch(
      updateTabs({ items: [...currentTabs, newDefaultTab], selectedItem: newDefaultTab })
    );
  };

export const disconnectTab: InternalStateThunkActionCreator<[TabActionPayload]> =
  ({ tabId }) =>
  (_, __, { runtimeStateManager }) => {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    const stateContainer = tabRuntimeState.stateContainer$.getValue();
    stateContainer?.dataState.cancel();
    stateContainer?.actions.stopSyncing();
    tabRuntimeState.customizationService$.getValue()?.cleanup();
  };

function differenceIterateeByTabId(tab: TabState) {
  return tab.id;
}
