/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy, pick } from 'lodash';
import {
  createStateContainer,
  type IKbnUrlStateStorage,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { TABS_STATE_URL_KEY } from '../../../../common/constants';
import type { TabState, RecentlyClosedTabState } from './redux/types';
import { createTabItem } from './redux/utils';
import type { DiscoverAppState } from './discover_app_state_container';

export const TABS_LOCAL_STORAGE_KEY = 'discover.tabs';
export const RECENTLY_CLOSED_TABS_LIMIT = 50;

type TabStateInLocalStorage = Pick<TabState, 'id' | 'label'> & {
  appState: DiscoverAppState | undefined;
  globalState: TabState['lastPersistedGlobalState'] | undefined;
};

type RecentlyClosedTabStateInLocalStorage = TabStateInLocalStorage &
  Pick<RecentlyClosedTabState, 'closedAt'>;

interface TabsStateInLocalStorage {
  userId: string;
  spaceId: string;
  openTabs: TabStateInLocalStorage[];
  closedTabs: RecentlyClosedTabStateInLocalStorage[];
}

const defaultTabsStateInLocalStorage: TabsStateInLocalStorage = {
  userId: '',
  spaceId: '',
  openTabs: [],
  closedTabs: [],
};

export interface TabsInternalStatePayload {
  groupId: string;
  allTabs: TabState[];
  selectedTabId: string;
  recentlyClosedTabs: RecentlyClosedTabState[];
}

export interface TabsUrlState {
  tabId?: string; // syncing the selected tab id with the URL
}

type TabsInStorageCache = Map<
  string,
  TabStateInLocalStorage | RecentlyClosedTabStateInLocalStorage
>;

export interface TabsStorageManager {
  /**
   * Supports two-way sync of the selected tab id with the URL.
   */
  startUrlSync: (props: { onChanged?: (nextState: TabsUrlState) => void }) => () => void;
  persistLocally: (
    props: TabsInternalStatePayload,
    getAppState: (tabId: string) => DiscoverAppState | undefined
  ) => Promise<void>;
  updateTabStateLocally: (
    tabId: string,
    tabState: Pick<TabStateInLocalStorage, 'appState' | 'globalState'>
  ) => void;
  loadLocally: (props: {
    userId: string;
    spaceId: string;
    defaultTabState: Omit<TabState, keyof TabItem>;
    defaultGroupId: string;
  }) => TabsInternalStatePayload;
  loadTabAppStateFromLocalCache: (tabId: string) => TabStateInLocalStorage['appState'];
  loadTabGlobalStateFromLocalCache: (tabId: string) => TabStateInLocalStorage['globalState'];
  getNRecentlyClosedTabs: (
    previousRecentlyClosedTabs: RecentlyClosedTabState[],
    newClosedTabs: TabState[]
  ) => RecentlyClosedTabState[];
}

export const createTabsStorageManager = ({
  urlStateStorage,
  storage,
  enabled,
}: {
  urlStateStorage: IKbnUrlStateStorage;
  storage: Storage;
  enabled?: boolean;
}): TabsStorageManager => {
  const urlStateContainer = createStateContainer<TabsUrlState>({});
  const sessionInfo = { userId: '', spaceId: '' };
  const tabsInStorageCache: TabsInStorageCache = new Map();

  const startUrlSync: TabsStorageManager['startUrlSync'] = ({
    onChanged, // can be called when selectedTabId changes in URL to trigger app state change if needed
  }) => {
    if (!enabled) {
      return () => {
        // do nothing
      };
    }

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

  const getSelectedTabIdFromURL = () => {
    return (urlStateStorage.get(TABS_STATE_URL_KEY) as TabsUrlState)?.tabId;
  };

  const pushSelectedTabIdToUrl = async (selectedTabId: string) => {
    const nextState: TabsUrlState = {
      tabId: selectedTabId,
    };
    await urlStateStorage.set(TABS_STATE_URL_KEY, nextState);
  };

  const toTabStateInStorage = (
    tabState: Pick<TabState, 'id' | 'label' | 'lastPersistedGlobalState'>,
    getAppState: (tabId: string) => DiscoverAppState | undefined
  ): TabStateInLocalStorage => {
    return {
      id: tabState.id,
      label: tabState.label,
      appState: getAppState(tabState.id),
      globalState: tabState.lastPersistedGlobalState,
    };
  };

  const toRecentlyClosedTabStateInStorage = (
    tabState: RecentlyClosedTabState,
    getAppState: (tabId: string) => DiscoverAppState | undefined
  ): RecentlyClosedTabStateInLocalStorage => {
    // runtime state might not be available for closed tabs, so we need to use the cached one
    const getAppStateForClosedTab = (tabId: string) =>
      getAppState(tabId) || tabsInStorageCache.get(tabId)?.appState;
    const state = toTabStateInStorage(tabState, getAppStateForClosedTab);
    return {
      ...state,
      closedAt: tabState.closedAt,
    };
  };

  const toTabState = (
    tabStateInStorage: TabStateInLocalStorage,
    defaultTabState: Omit<TabState, keyof TabItem>
  ): TabState => ({
    ...defaultTabState,
    ...pick(tabStateInStorage, 'id', 'label'),
    lastPersistedGlobalState:
      tabStateInStorage.globalState || defaultTabState.lastPersistedGlobalState,
  });

  const toRecentlyClosedTabState = (
    tabStateInStorage: RecentlyClosedTabStateInLocalStorage,
    defaultTabState: Omit<TabState, keyof TabItem>
  ): RecentlyClosedTabState => ({
    ...toTabState(tabStateInStorage, defaultTabState),
    closedAt: tabStateInStorage.closedAt,
  });

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
      userId: parsedTabsState?.userId || '',
      spaceId: parsedTabsState?.spaceId || '',
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

  const persistLocally: TabsStorageManager['persistLocally'] = async (
    { allTabs, selectedTabId, recentlyClosedTabs },
    getAppState
  ) => {
    if (!enabled) {
      return;
    }

    await pushSelectedTabIdToUrl(selectedTabId);

    const keptTabIds: Record<string, boolean> = {};

    const openTabs: TabsStateInLocalStorage['openTabs'] = allTabs.map((tab) => {
      const tabStateInStorage = toTabStateInStorage(tab, getAppState);
      keptTabIds[tab.id] = true;
      tabsInStorageCache.set(tab.id, tabStateInStorage);
      return tabStateInStorage;
    });
    const closedTabs: TabsStateInLocalStorage['closedTabs'] = recentlyClosedTabs.map((tab) => {
      const tabStateInStorage = toRecentlyClosedTabStateInStorage(tab, getAppState);
      keptTabIds[tab.id] = true;
      tabsInStorageCache.set(tab.id, tabStateInStorage);
      return tabStateInStorage;
    });

    for (const tabId of tabsInStorageCache.keys()) {
      if (!keptTabIds[tabId]) {
        tabsInStorageCache.delete(tabId);
      }
    }

    const nextTabsInStorage: TabsStateInLocalStorage = {
      userId: sessionInfo.userId,
      spaceId: sessionInfo.spaceId,
      openTabs,
      closedTabs, // wil be used for "Recently closed tabs" feature
    };

    storage.set(TABS_LOCAL_STORAGE_KEY, JSON.stringify(nextTabsInStorage));
  };

  const updateTabStateLocally: TabsStorageManager['updateTabStateLocally'] = (
    tabId,
    tabStatePartial
  ) => {
    if (!enabled) {
      return;
    }
    let hasModifications = false;
    const storedTabsState = readFromLocalStorage();
    const updatedTabsState = {
      ...storedTabsState,
      openTabs: storedTabsState.openTabs.map((tab) => {
        if (tab.id === tabId) {
          hasModifications = true;
          const newTabStateInStorage = {
            ...tab,
            appState: tabStatePartial.appState,
            globalState: tabStatePartial.globalState,
          };

          tabsInStorageCache.set(tabId, newTabStateInStorage);
          return newTabStateInStorage;
        }
        return tab;
      }),
    };

    if (hasModifications) {
      storage.set(TABS_LOCAL_STORAGE_KEY, JSON.stringify(updatedTabsState));
    }
  };

  const loadTabAppStateFromLocalCache: TabsStorageManager['loadTabAppStateFromLocalCache'] = (
    tabId
  ) => {
    if (!enabled) {
      return undefined;
    }
    const appState = tabsInStorageCache.get(tabId)?.appState;

    if (!appState || !Object.values(appState).filter(Boolean).length) {
      return undefined;
    }

    return appState;
  };

  const loadTabGlobalStateFromLocalCache: TabsStorageManager['loadTabGlobalStateFromLocalCache'] = (
    tabId
  ) => {
    if (!enabled) {
      return undefined;
    }
    const globalState = tabsInStorageCache.get(tabId)?.globalState;

    if (!globalState || !Object.values(globalState).filter(Boolean).length) {
      return undefined;
    }

    return globalState;
  };

  const loadLocally: TabsStorageManager['loadLocally'] = ({
    userId,
    spaceId,
    defaultTabState,
    defaultGroupId,
  }) => {
    const selectedTabId = enabled ? getSelectedTabIdFromURL() : undefined;
    let storedTabsState: TabsStateInLocalStorage = enabled
      ? readFromLocalStorage()
      : defaultTabsStateInLocalStorage;

    if (storedTabsState.userId !== userId || storedTabsState.spaceId !== spaceId) {
      // if the userId or spaceId has changed, don't read from the local storage
      storedTabsState = {
        ...defaultTabsStateInLocalStorage,
        userId,
        spaceId,
      };
    }

    sessionInfo.userId = userId;
    sessionInfo.spaceId = spaceId;

    storedTabsState.openTabs.forEach((tab) => {
      tabsInStorageCache.set(tab.id, tab);
    });
    storedTabsState.closedTabs.forEach((tab) => {
      tabsInStorageCache.set(tab.id, tab);
    });

    const openTabs = storedTabsState.openTabs.map((tab) => toTabState(tab, defaultTabState));
    const closedTabs = storedTabsState.closedTabs.map((tab) =>
      toRecentlyClosedTabState(tab, defaultTabState)
    );

    if (enabled) {
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
              .map((tab) => toTabState(tab, defaultTabState)),
            selectedTabId,
            recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
          };
        }
      }
    }

    const defaultTab: TabState = {
      ...defaultTabState,
      ...createTabItem([]),
    };

    tabsInStorageCache.set(
      defaultTab.id,
      toTabStateInStorage(defaultTab, () => undefined)
    );

    return {
      groupId: defaultGroupId,
      allTabs: [defaultTab],
      selectedTabId: defaultTab.id,
      recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
    };
  };

  return {
    startUrlSync,
    persistLocally,
    updateTabStateLocally,
    loadLocally,
    loadTabAppStateFromLocalCache,
    loadTabGlobalStateFromLocalCache,
    getNRecentlyClosedTabs,
  };
};
