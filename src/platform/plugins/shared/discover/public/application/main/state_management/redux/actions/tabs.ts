/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabbedContentState } from '@kbn/unified-tabs/src/components/tabbed_content/tabbed_content';
import { differenceBy } from 'lodash';
import type { TabState } from '../types';
import { selectAllTabs, selectCurrentTab } from '../selectors';
import {
  defaultTabState,
  internalStateSlice,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import { createTabRuntimeState } from '../runtime_state';

export const setTabs: InternalStateThunkActionCreator<
  [Parameters<typeof internalStateSlice.actions.setTabs>[0]]
> =
  (params) =>
  (dispatch, getState, { runtimeStateManager }) => {
    const previousTabs = selectAllTabs(getState());
    const removedTabs = differenceBy(previousTabs, params.allTabs, (tab) => tab.id);
    const addedTabs = differenceBy(params.allTabs, previousTabs, (tab) => tab.id);

    for (const tab of removedTabs) {
      delete runtimeStateManager.tabs.byId[tab.id];
    }

    for (const tab of addedTabs) {
      runtimeStateManager.tabs.byId[tab.id] = createTabRuntimeState();
    }

    dispatch(internalStateSlice.actions.setTabs(params));
  };

interface UpdateTabsParams {
  updateState: TabbedContentState;
  stopSyncing?: () => void;
}

export const updateTabs: InternalStateThunkActionCreator<[UpdateTabsParams], Promise<void>> =
  ({ updateState: { items, selectedItem }, stopSyncing }) =>
  async (dispatch, getState, { urlStateStorage }) => {
    const currentState = getState();
    const currentTab = selectCurrentTab(currentState);
    let updatedTabs = items.map<TabState>((item) => {
      const existingTab = currentState.tabs.byId[item.id];
      return existingTab ? { ...existingTab, ...item } : { ...defaultTabState, ...item };
    });

    if (selectedItem?.id !== currentTab.id) {
      stopSyncing?.();

      updatedTabs = updatedTabs.map((tab) =>
        tab.id === currentTab.id
          ? {
              ...tab,
              globalState: urlStateStorage.get('_g') ?? undefined,
              appState: urlStateStorage.get('_a') ?? undefined,
            }
          : tab
      );

      const existingTab = selectedItem ? currentState.tabs.byId[selectedItem.id] : undefined;

      if (existingTab) {
        await urlStateStorage.set('_g', existingTab.globalState);
        await urlStateStorage.set('_a', existingTab.appState);
      } else {
        await urlStateStorage.set('_g', {});
        await urlStateStorage.set('_a', {});
      }
    }

    dispatch(
      setTabs({
        allTabs: updatedTabs,
        selectedTabId: selectedItem?.id ?? currentTab.id,
      })
    );
  };
