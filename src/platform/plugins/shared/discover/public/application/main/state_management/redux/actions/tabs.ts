/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabbedContentState } from '@kbn/unified-tabs/src/components/tabbed_content/tabbed_content';
import { cloneDeep, differenceBy, orderBy } from 'lodash';
import type { RecentlyClosedTabState, TabState } from '../types';
import { selectAllTabs, selectTab } from '../selectors';
import {
  defaultTabState,
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import { createTabRuntimeState, selectTabRuntimeState } from '../runtime_state';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> =
  (params) =>
  (dispatch, getState, { runtimeStateManager }) => {
    const previousState = getState();
    const previousTabs = selectAllTabs(previousState);
    const removedTabs = differenceBy(previousTabs, params.allTabs, (tab) => tab.id);
    const addedTabs = differenceBy(params.allTabs, previousTabs, (tab) => tab.id);

    const closedAt = Date.now();
    const recentlyClosedTabs: RecentlyClosedTabState[] = [];

    for (const tab of removedTabs) {
      dispatch(disconnectTab({ tabId: tab.id }));
      delete runtimeStateManager.tabs.byId[tab.id];
      recentlyClosedTabs.push({
        ...tab,
        closedAt,
      });
    }

    for (const tab of addedTabs) {
      runtimeStateManager.tabs.byId[tab.id] = createTabRuntimeState();
    }

    dispatch(
      internalStateSlice.actions.setTabs({
        ...params,
        // TODO: keep only the last N closed tabs
        recentlyClosedTabs: orderBy(
          [...params.recentlyClosedTabs, ...recentlyClosedTabs],
          'closedAt',
          'desc'
        ),
      })
    );
  };

export const updateTabs: InternalStateThunkActionCreator<[TabbedContentState], Promise<void>> =
  ({ items, selectedItem }) =>
  async (dispatch, getState, { services, runtimeStateManager, urlStateStorage }) => {
    const currentState = getState();
    const currentTab = selectTab(currentState, currentState.tabs.unsafeCurrentId);
    let updatedTabs = items.map<TabState>((item) => {
      const existingTab = selectTab(currentState, item.id);
      return existingTab ? { ...existingTab, ...item } : { ...defaultTabState, ...item };
    });

    if (selectedItem?.id !== currentTab.id) {
      const previousTabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTab.id);

      previousTabRuntimeState.stateContainer$.getValue()?.actions.stopSyncing();

      updatedTabs = updatedTabs.map((tab) =>
        tab.id === currentTab.id
          ? {
              ...tab,
              globalState: urlStateStorage.get(GLOBAL_STATE_URL_KEY) ?? undefined,
              appState: urlStateStorage.get(APP_STATE_URL_KEY) ?? undefined,
            }
          : tab
      );

      const nextTab = selectedItem ? selectTab(currentState, selectedItem.id) : undefined;

      if (nextTab) {
        await urlStateStorage.set(GLOBAL_STATE_URL_KEY, nextTab.globalState);
        await urlStateStorage.set(APP_STATE_URL_KEY, nextTab.appState);
      } else {
        await urlStateStorage.set(GLOBAL_STATE_URL_KEY, null);
        await urlStateStorage.set(APP_STATE_URL_KEY, null);
      }

      const nextTabRuntimeState = selectedItem
        ? selectTabRuntimeState(runtimeStateManager, selectedItem.id)
        : undefined;
      const nextTabStateContainer = nextTabRuntimeState?.stateContainer$.getValue();

      if (nextTabStateContainer) {
        const {
          time,
          refreshInterval,
          filters: globalFilters,
        } = nextTabStateContainer.globalState.get() ?? {};
        const { filters: appFilters, query } = nextTabStateContainer.appState.getState();

        services.timefilter.setTime(time ?? services.timefilter.getTimeDefaults());
        services.timefilter.setRefreshInterval(
          refreshInterval ?? services.timefilter.getRefreshIntervalDefaults()
        );
        services.filterManager.setGlobalFilters(globalFilters ?? []);
        services.filterManager.setAppFilters(cloneDeep(appFilters ?? []));
        services.data.query.queryString.setQuery(
          query ?? services.data.query.queryString.getDefaultQuery()
        );

        nextTabStateContainer.actions.initializeAndSync();
      }
    }

    dispatch(
      setTabs({
        allTabs: updatedTabs,
        selectedTabId: selectedItem?.id ?? currentTab.id,
        recentlyClosedTabs: currentState.tabs.recentlyClosedTabs,
      })
    );
  };

export const updateTabAppStateAndGlobalState: InternalStateThunkActionCreator<[TabActionPayload]> =
  ({ tabId }) =>
  (dispatch, _, { urlStateStorage }) => {
    dispatch(
      internalStateSlice.actions.setTabAppStateAndGlobalState({
        tabId,
        appState: urlStateStorage.get(APP_STATE_URL_KEY) ?? undefined,
        globalState: urlStateStorage.get(GLOBAL_STATE_URL_KEY) ?? undefined,
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
