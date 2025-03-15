/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabbedContentState } from '@kbn/unified-tabs/src/components/tabbed_content/tabbed_content';
import { createInternalStateAsyncThunk } from '../utils';
import type { TabState } from '../types';
import { selectAllTabs, selectCurrentTab } from '../selectors';

export const updateTabs = createInternalStateAsyncThunk(
  'internalState/updateTabs',
  async (
    {
      updateState: { items, selectedItem },
      stopSyncing,
    }: {
      updateState: TabbedContentState;
      stopSyncing?: () => void;
    },
    { getState, extra: { urlStateStorage } }
  ) => {
    const allTabs = selectAllTabs(getState());
    const currentTab = selectCurrentTab(getState());
    let updatedTabs: TabState[] = items.map(
      (item) => allTabs.find((tab) => tab.id === item.id) ?? (item as TabState)
    );

    if (selectedItem && selectedItem?.id !== currentTab.id) {
      stopSyncing?.();

      if (currentTab) {
        const updatedTab: TabState = {
          ...currentTab,
          globalState: urlStateStorage.get('_g') ?? undefined,
          appState: urlStateStorage.get('_a') ?? undefined,
        };

        updatedTabs = updatedTabs.map((tab) => (tab.id === currentTab.id ? updatedTab : tab));
      }

      const selectedTab = allTabs.find((tab) => tab.id === selectedItem.id);

      if (selectedTab) {
        await urlStateStorage.set('_g', selectedTab.globalState);
        await urlStateStorage.set('_a', selectedTab.appState);
      } else {
        await urlStateStorage.set('_g', {});
        await urlStateStorage.set('_a', {});
      }
    }

    return { updatedTabs, selectedTabId: selectedItem?.id ?? currentTab.id };
  }
);
