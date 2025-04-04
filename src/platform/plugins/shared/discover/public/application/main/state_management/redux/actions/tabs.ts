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
import type { TabState } from '../types';
import { selectAllTabs, selectTab } from '../selectors';
import {
  defaultTabState,
  internalStateSlice,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import { createTabRuntimeState, selectTabRuntimeState } from '../runtime_state';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> =
  (params) =>
  (dispatch, getState, { runtimeStateManager }) => {
    const previousTabs = selectAllTabs(getState());
    const removedTabs = differenceBy(previousTabs, params.allTabs, (tab) => tab.id);
    const addedTabs = differenceBy(params.allTabs, previousTabs, (tab) => tab.id);

    for (const tab of removedTabs) {
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tab.id);

      tabRuntimeState.stateContainer$.getValue()?.actions.stopSyncing();
      tabRuntimeState.customizationService$.getValue()?.cleanup();

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

      previousTabRuntimeState.stateContainer$.getValue()?.actions.stopSyncing();

      updatedTabs = updatedTabs.map((tab) =>
        tab.id === currentTab.id
          ? {
              ...tab,
              globalState: urlStateStorage.get('_g') ?? undefined,
              appState: urlStateStorage.get('_a') ?? undefined,
            }
          : tab
      );

      const nextTab = selectedItem ? selectTab(currentState, selectedItem.id) : undefined;

      if (nextTab) {
        await urlStateStorage.set('_g', nextTab.globalState);
        await urlStateStorage.set('_a', nextTab.appState);
      } else {
        await urlStateStorage.set('_g', {});
        await urlStateStorage.set('_a', {});
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
      })
    );
  };
