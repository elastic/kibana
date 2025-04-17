/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy } from 'lodash';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { TABS_STATE_URL_KEY } from '../../../../common/constants';
import type { TabState, RecentlyClosedTabState } from './redux/types';
import { createTabItem } from './redux/utils';
import type { DiscoverAppState } from './discover_app_state_container';

export const TABS_LOCAL_STORAGE_KEY = 'discover.tabs';
export const RECENTLY_CLOSED_TABS_LIMIT = 50;

type TabStateInLocalStorage = Pick<TabState, 'id' | 'label'> & {
  appState: DiscoverAppState;
  globalState: TabState['lastPersistedGlobalState'];
};

type RecentlyClosedTabStateInLocalStorage = TabStateInLocalStorage &
  Pick<RecentlyClosedTabState, 'closedAt'>;

interface TabsStateInLocalStorage {
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
}

export interface TabsInternalStatePayload {
  groupId: string;
  allTabs: TabState[];
  selectedTabId: string;
  recentlyClosedTabs: RecentlyClosedTabState[];
}

export interface TabsStorageState {
  tabId?: string; // syncing the selected tab id with the URL
}

export interface TabsStorageManager {
  persistLocally: (props: TabsInternalStatePayload) => Promise<void>;
  updateTabStateLocally: (
    tabId: string,
    tabState: Pick<TabState, 'lastPersistedAppState' | 'lastPersistedGlobalState'>
  ) => void;
  loadLocally: (props: {
    defaultTabState: Omit<TabState, keyof TabItem>;
    defaultGroupId: string;
  }) => TabsInternalStatePayload;
  getNRecentlyClosedTabs: (
    previousRecentlyClosedTabs: RecentlyClosedTabState[],
    newClosedTabs: TabState[]
  ) => RecentlyClosedTabState[];
}

export const createTabsStorageManager = ({
  urlStateStorage,
  storage,
}: {
  urlStateStorage: IKbnUrlStateStorage;
  storage: Storage;
}): TabsStorageManager => {
  const getSelectedTabIdFromURL = () => {
    return (urlStateStorage.get(TABS_STATE_URL_KEY) as TabsStorageState)?.tabId;
  };

  const pushSelectedTabIdToUrl = async (selectedTabId: string) => {
    const nextState: TabsStorageState = {
      tabId: selectedTabId,
    };
    await urlStateStorage.set(TABS_STATE_URL_KEY, nextState, { replace: true });
  };

  const toTabStateInStorage = (
    tabState: TabState | TabStateInLocalStorage
  ): TabStateInLocalStorage => {
    return {
      id: tabState.id,
      label: tabState.label,
      appState: ('appState' in tabState ? tabState.appState : tabState.lastPersistedAppState) || {},
      globalState:
        ('globalState' in tabState ? tabState.globalState : tabState.lastPersistedGlobalState) ||
        {},
    };
  };

  const toRecentlyClosedTabStateInStorage = (
    tabState: RecentlyClosedTabState
  ): RecentlyClosedTabStateInLocalStorage => {
    const state = toTabStateInStorage(tabState);
    return {
      ...state,
      closedAt: tabState.closedAt,
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

  const getNRecentlyClosedTabs: TabsStorageManager['getNRecentlyClosedTabs'] = (
    previousRecentlyClosedTabs,
    newClosedTabs
  ) => {
    const closedAt = Date.now();
    const newRecentlyClosedTabs: RecentlyClosedTabState[] = newClosedTabs.map((tab) => ({
      ...tab,
      closedAt,
    }));

    const newSortedRecentlyClosedTabs = orderBy(
      [...newRecentlyClosedTabs, ...previousRecentlyClosedTabs],
      'closedAt',
      'desc'
    );

    const latestNRecentlyClosedTabs = newSortedRecentlyClosedTabs.slice(
      0,
      RECENTLY_CLOSED_TABS_LIMIT
    );

    const recentClosedAt =
      latestNRecentlyClosedTabs[latestNRecentlyClosedTabs.length - 1]?.closedAt;

    if (recentClosedAt) {
      // keep other recently closed tabs from the same time point when they were closed
      for (let i = RECENTLY_CLOSED_TABS_LIMIT; i < newSortedRecentlyClosedTabs.length; i++) {
        if (newSortedRecentlyClosedTabs[i].closedAt === recentClosedAt) {
          latestNRecentlyClosedTabs.push(newSortedRecentlyClosedTabs[i]);
        } else {
          break;
        }
      }
    }

    return latestNRecentlyClosedTabs;
  };

  const persistLocally: TabsStorageManager['persistLocally'] = async ({
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
        if (tab.id === tabId) {
          hasModifications = true;
          return toTabStateInStorage({
            ...tab,
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

  const loadLocally: TabsStorageManager['loadLocally'] = ({
    defaultTabState,
    defaultGroupId,
  }): TabsInternalStatePayload => {
    const toTabState = (tabStateInStorage: TabStateInLocalStorage): TabState => ({
      ...defaultTabState,
      ...tabStateInStorage,
      lastPersistedAppState: {
        ...defaultTabState.lastPersistedAppState,
        ...tabStateInStorage.appState,
      },
      lastPersistedGlobalState: {
        ...defaultTabState.lastPersistedGlobalState,
        ...tabStateInStorage.globalState,
      },
    });
    const toRecentlyClosedTabState = (
      tabStateInStorage: RecentlyClosedTabStateInLocalStorage
    ): RecentlyClosedTabState => ({
      ...toTabState(tabStateInStorage),
      closedAt: tabStateInStorage.closedAt,
    });
    const selectedTabId = getSelectedTabIdFromURL();
    const storedTabsState = readFromLocalStorage();
    const openTabs = storedTabsState.openTabs.map(toTabState);
    const closedTabs = storedTabsState.closedTabs.map(toRecentlyClosedTabState);

    if (selectedTabId) {
      // restore previously opened tabs
      if (openTabs.find((tab) => tab.id === selectedTabId)) {
        return {
          groupId: defaultGroupId,
          allTabs: openTabs,
          selectedTabId,
          recentlyClosedTabs: closedTabs,
        };
      }

      const storedClosedTab = storedTabsState.closedTabs.find((tab) => tab.id === selectedTabId);

      if (storedClosedTab) {
        // restore previously closed tabs, for example when only the default tab was shown
        return {
          groupId: defaultGroupId,
          allTabs: storedTabsState.closedTabs
            .filter((tab) => tab.closedAt === storedClosedTab.closedAt)
            .map(toTabState),
          selectedTabId,
          recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
        };
      }
    }

    const defaultTab: TabState = {
      ...defaultTabState,
      ...createTabItem([]),
    };

    return {
      groupId: defaultGroupId,
      allTabs: [defaultTab],
      selectedTabId: defaultTab.id,
      recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
    };
  };

  return {
    persistLocally,
    updateTabStateLocally,
    loadLocally,
    getNRecentlyClosedTabs,
  };
};
