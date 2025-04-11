/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createStateContainer,
  type IKbnUrlStateStorage,
  type ReduxLikeStateContainer,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { TABS_STATE_URL_KEY } from '../../../../common/constants';
import type { TabState, RecentlyClosedTabState } from './redux/types';
import { createTabItem } from './redux/utils';

const TABS_LOCAL_STORAGE_KEY = 'discover.tabs';

interface TabStateInLocalStorage {
  tabState: Pick<TabState, 'id' | 'label' | 'dataViewId' | 'appState' | 'globalState'>;
  version: string;
}

interface RecentlyClosedTabStateInLocalStorage extends Omit<TabStateInLocalStorage, 'tabState'> {
  tabState: TabStateInLocalStorage['tabState'] & {
    closedAt: number;
  };
}

interface TabsStateInLocalStorage {
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
}

interface TabsInternalStatePayload {
  allTabs: TabState[];
  selectedTabId: string;
  recentlyClosedTabs: RecentlyClosedTabState[];
}

export interface TabsStorageState {
  id?: string; // syncing the selected tab id with the URL
}

export interface TabsStorageManager {
  /**
   * Supports two-way sync of the selected tab id with the URL.
   * Currently, we use it only one way - from internal state to URL.
   */
  urlStateContainer: ReduxLikeStateContainer<TabsStorageState>;
  startUrlSync: () => () => void;
  persistLocally: (props: TabsInternalStatePayload) => Promise<void>;
  updateTabStateLocally: (
    tabId: string,
    tabState: Pick<TabState, 'globalState' | 'appState'>
  ) => void;
  loadLocally: (props: {
    defaultTabState: Omit<TabState, keyof TabItem>;
  }) => TabsInternalStatePayload;
}

export const getTabsStorageManager = ({
  urlStateStorage,
  storage,
  onChanged,
}: {
  urlStateStorage: IKbnUrlStateStorage;
  storage: Storage;
  onChanged?: (nextState: TabsStorageState) => void; // can be called when selectedTabId changes in URL to trigger app state change if needed
}): TabsStorageManager => {
  const urlStateContainer = createStateContainer<TabsStorageState>({});

  const startUrlSync = () => {
    const { start, stop } = syncState({
      stateStorage: urlStateStorage,
      stateContainer: {
        ...urlStateContainer,
        set: (state) => {
          if (state) {
            // syncState utils requires to handle incoming "null" value
            urlStateContainer.set(state);
          }
        },
      },
      storageKey: TABS_STATE_URL_KEY,
    });

    const listener = onChanged
      ? urlStateContainer.state$.subscribe((state) => {
          onChanged(state);
        })
      : null;

    start();

    return () => {
      listener?.unsubscribe();
      stop();
    };
  };

  const getSelectedTabIdFromUrl = () => {
    return (urlStateStorage.get(TABS_STATE_URL_KEY) as TabsStorageState)?.id; // can be called even before sync with URL started
  };

  const pushSelectedTabIdToUrl = async (selectedTabId: string) => {
    const nextState: TabsStorageState = {
      id: selectedTabId,
    };
    await urlStateStorage.set(TABS_STATE_URL_KEY, nextState); // can be called even before sync with URL started
  };

  const toTabStateInStorage = (
    tabState: TabState | TabStateInLocalStorage['tabState']
  ): TabStateInLocalStorage => {
    return {
      tabState: {
        id: tabState.id,
        label: tabState.label,
        dataViewId: tabState.dataViewId,
        appState: tabState.appState,
        globalState: tabState.globalState,
      },
      version: '1',
    };
  };

  const toRecentlyClosedTabStateInStorage = (
    tabState: RecentlyClosedTabState
  ): RecentlyClosedTabStateInLocalStorage => {
    const state = toTabStateInStorage(tabState);
    return {
      ...state,
      tabState: {
        ...state.tabState,
        closedAt: tabState.closedAt,
      },
    };
  };

  const readFromLocalStorage = (): TabsStateInLocalStorage => {
    const storedTabsState = storage.get(TABS_LOCAL_STORAGE_KEY);
    let parsedTabsState: TabsStateInLocalStorage | null = null;
    if (storedTabsState) {
      try {
        parsedTabsState = JSON.parse(storedTabsState);
      } catch {
        // suppress error
      }
    }

    return {
      openTabs: parsedTabsState?.openTabs || [],
      closedTabs: parsedTabsState?.closedTabs || [],
    };
  };

  const persistLocally = async ({
    allTabs,
    selectedTabId,
    recentlyClosedTabs,
  }: TabsInternalStatePayload) => {
    await pushSelectedTabIdToUrl(selectedTabId);
    const openTabs: TabsStateInLocalStorage['openTabs'] = allTabs.map(toTabStateInStorage);
    const closedTabs: TabsStateInLocalStorage['closedTabs'] = recentlyClosedTabs.map(
      toRecentlyClosedTabStateInStorage
    );

    const nextTabsInStorage: TabsStateInLocalStorage = {
      openTabs,
      closedTabs, // wil be used for "Recently closed tabs" feature
    };

    storage.set(TABS_LOCAL_STORAGE_KEY, JSON.stringify(nextTabsInStorage));
  };

  const updateTabStateLocally: TabsStorageManager['updateTabStateLocally'] = (
    tabId,
    tabStatePartial
  ) => {
    let hasModifications = false;
    const storedTabsState = readFromLocalStorage();
    const updatedTabsState = {
      ...storedTabsState,
      openTabs: storedTabsState.openTabs.map((tab) => {
        if (tab.tabState.id === tabId) {
          hasModifications = true;
          return toTabStateInStorage({
            ...tab.tabState,
            ...tabStatePartial,
          });
        }
        return tab;
      }),
    };

    if (hasModifications) {
      storage.set(TABS_LOCAL_STORAGE_KEY, JSON.stringify(updatedTabsState));
    }
  };

  const loadLocally = ({
    defaultTabState,
  }: {
    defaultTabState: Omit<TabState, keyof TabItem>;
  }): TabsInternalStatePayload => {
    const toTabState = (tabStateInStorage: TabStateInLocalStorage): TabState => ({
      ...defaultTabState,
      ...tabStateInStorage.tabState,
      appState: {
        ...defaultTabState.appState,
        ...tabStateInStorage.tabState.appState,
      },
      globalState: {
        ...defaultTabState.globalState,
        ...tabStateInStorage.tabState.globalState,
      },
    });
    const toRecentlyClosedTabState = (
      tabStateInStorage: RecentlyClosedTabStateInLocalStorage
    ): RecentlyClosedTabState => ({
      ...toTabState(tabStateInStorage),
      closedAt: tabStateInStorage.tabState.closedAt,
    });
    const selectedTabId = getSelectedTabIdFromUrl();
    const storedTabsState = readFromLocalStorage();
    const openTabs = storedTabsState.openTabs.map(toTabState);
    const closedTabs = storedTabsState.closedTabs.map(toRecentlyClosedTabState);

    if (selectedTabId) {
      // restore previously opened tabs
      if (openTabs.find((tab) => tab.id === selectedTabId)) {
        return {
          allTabs: openTabs,
          selectedTabId,
          recentlyClosedTabs: closedTabs,
        };
      }

      const storedClosedTab = storedTabsState.closedTabs.find(
        (tab) => tab.tabState.id === selectedTabId
      );

      if (storedClosedTab) {
        // restore previously closed tabs, for example when only the default tab was shown
        return {
          allTabs: storedTabsState.closedTabs
            .filter((tab) => tab.tabState.closedAt === storedClosedTab.tabState.closedAt)
            .map(toTabState),
          selectedTabId,
          recentlyClosedTabs: closedTabs,
        };
      }
    }

    const defaultTab: TabState = {
      ...defaultTabState,
      ...createTabItem([]),
    };

    return {
      allTabs: [defaultTab],
      selectedTabId: defaultTab.id,
      recentlyClosedTabs: closedTabs,
    };
  };

  return {
    urlStateContainer,
    startUrlSync,
    persistLocally,
    updateTabStateLocally,
    loadLocally,
  };
};
