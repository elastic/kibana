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
import type { TabState } from '../types';
import { selectAllTabs, selectRecentlyClosedTabs, selectTab } from '../selectors';
import {
  defaultTabState,
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  createTabRuntimeState,
  selectTabRuntimeState,
  selectTabRuntimeAppState,
  selectTabRuntimeGlobalState,
  selectRestorableTabRuntimeHistogramLayoutProps,
} from '../runtime_state';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import type { DiscoverAppState } from '../../discover_app_state_container';
import { createTabItem } from '../utils';

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
          unifiedHistogramLayoutProps: tab.duplicatedFromId
            ? selectRestorableTabRuntimeHistogramLayoutProps(
                runtimeStateManager,
                tab.duplicatedFromId
              )
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
    const updatedTabs = items.map<TabState>((item) => {
      const existingTab = selectTab(currentState, item.id);

      const tab: TabState = {
        ...defaultTabState,
        ...existingTab,
        ...pick(item, 'id', 'label', 'duplicatedFromId'),
      };

      if (item.duplicatedFromId && !existingTab) {
        const existingTabToDuplicateFrom = selectTab(currentState, item.duplicatedFromId);

        if (!existingTabToDuplicateFrom) {
          return tab;
        }

        tab.initialAppState =
          selectTabRuntimeAppState(runtimeStateManager, item.duplicatedFromId) ??
          cloneDeep(existingTabToDuplicateFrom.initialAppState);
        tab.initialGlobalState = cloneDeep({
          ...existingTabToDuplicateFrom.initialGlobalState,
          ...existingTabToDuplicateFrom.lastPersistedGlobalState,
        });
        tab.uiState = cloneDeep(existingTabToDuplicateFrom.uiState);
      }

      return tab;
    });

    if (selectedItem?.id !== currentTab.id) {
      const previousTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTab.id);
      const previousTabStateContainer = previousTabRuntimeState.stateContainer$.getValue();

      previousTabStateContainer?.actions.stopSyncing();

      const nextTab = selectedItem ? selectTab(currentState, selectedItem.id) : undefined;
      const nextTabRuntimeState = selectedItem
        ? selectTabRuntimeState(runtimeStateManager, selectedItem.id)
        : undefined;
      const nextTabStateContainer = nextTabRuntimeState?.stateContainer$.getValue();

      if (nextTab && nextTabStateContainer) {
        const {
          timeRange,
          refreshInterval,
          filters: globalFilters,
        } = nextTab.lastPersistedGlobalState;
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
    }

    dispatch(
      setTabs({
        allTabs: updatedTabs,
        selectedTabId: selectedItem?.id ?? currentTab.id,
        recentlyClosedTabs: selectRecentlyClosedTabs(currentState),
      })
    );
  };

export const updateTabAppStateAndGlobalState: InternalStateThunkActionCreator<[TabActionPayload]> =
  ({ tabId }) =>
  (dispatch, _, { runtimeStateManager }) => {
    dispatch(
      internalStateSlice.actions.setTabAppStateAndGlobalState({
        tabId,
        appState: selectTabRuntimeAppState(runtimeStateManager, tabId),
        globalState: selectTabRuntimeGlobalState(runtimeStateManager, tabId),
      })
    );
  };

export const initializeTabs: InternalStateThunkActionCreator<
  [{ userId: string; spaceId: string }]
> =
  ({ userId, spaceId }) =>
  (dispatch, _, { tabsStorageManager }) => {
    const initialTabsState = tabsStorageManager.loadLocally({
      userId,
      spaceId,
      defaultTabState,
    });

    dispatch(setTabs(initialTabsState));
  };

export const clearAllTabs: InternalStateThunkActionCreator = () => (dispatch) => {
  const defaultTab: TabState = {
    ...defaultTabState,
    ...createTabItem([]),
  };

  return dispatch(updateTabs({ items: [defaultTab], selectedItem: defaultTab }));
};

export const restoreTab: InternalStateThunkActionCreator<[{ restoreTabId: string }]> =
  ({ restoreTabId }) =>
  (dispatch, getState) => {
    const currentState = getState();

    if (restoreTabId === currentState.tabs.unsafeCurrentId) {
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
