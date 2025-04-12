/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabbedContentState } from '@kbn/unified-tabs/src/components/tabbed_content/tabbed_content';
import { cloneDeep, differenceBy } from 'lodash';
import type { QueryState } from '@kbn/data-plugin/common';
import type { TabState } from '../types';
import { selectAllTabs, selectTab } from '../selectors';
import {
  defaultTabState,
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import { createTabRuntimeState, selectTabRuntimeState } from '../runtime_state';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { GLOBAL_STATE_URL_KEY } from '../../discover_global_state_container';
import type { DiscoverAppState } from '../../discover_app_state_container';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> =
  (params) =>
  (dispatch, getState, { runtimeStateManager }) => {
    const previousTabs = selectAllTabs(getState());
    const removedTabs = differenceBy(previousTabs, params.allTabs, (tab) => tab.id);
    const addedTabs = differenceBy(params.allTabs, previousTabs, (tab) => tab.id);

    for (const tab of removedTabs) {
      dispatch(disconnectTab({ tabId: tab.id }));
      delete runtimeStateManager.tabs.byId[tab.id];
    }

    for (const tab of addedTabs) {
      runtimeStateManager.tabs.byId[tab.id] = createTabRuntimeState();
    }

    dispatch(internalStateSlice.actions.setTabs(params));
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
      const previousTabStateContainer = previousTabRuntimeState.stateContainer$.getValue();

      previousTabStateContainer?.actions.stopSyncing();

      updatedTabs = updatedTabs.map((tab) => {
        if (tab.id !== currentTab.id) {
          return tab;
        }

        const {
          time: timeRange,
          refreshInterval,
          filters,
        } = previousTabStateContainer?.globalState.get() ?? {};

        return { ...tab, lastPersistedGlobalState: { timeRange, refreshInterval, filters } };
      });

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
