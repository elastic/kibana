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
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { TABS_STATE_URL_KEY } from '../../../../common/constants';
import type { TabState, RecentlyClosedTabState } from './redux/types';
import { createTabItem } from './redux/utils';
import type { DiscoverAppState } from './discover_app_state_container';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';

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
  allTabs: TabState[];
  selectedTabId: string;
  recentlyClosedTabs: RecentlyClosedTabState[];
}

export interface TabsUrlState {
  tabId?: string; // syncing the selected tab id with the URL
}

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
    persistedDiscoverSession?: DiscoverSession;
    defaultTabState: Omit<TabState, keyof TabItem>;
  }) => TabsInternalStatePayload;
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
    tabState: TabState,
    getAppState: (tabId: string) => DiscoverAppState | undefined
  ): TabStateInLocalStorage => {
    const getAppStateForTabWithoutRuntimeState = (tabId: string) =>
      getAppState(tabId) || tabState.initialAppState;

    return {
      id: tabState.id,
      label: tabState.label,
      appState: getAppStateForTabWithoutRuntimeState(tabState.id),
      globalState: tabState.lastPersistedGlobalState || tabState.initialGlobalState,
    };
  };

  const toRecentlyClosedTabStateInStorage = (
    tabState: RecentlyClosedTabState,
    getAppState: (tabId: string) => DiscoverAppState | undefined
  ): RecentlyClosedTabStateInLocalStorage => {
    const state = toTabStateInStorage(tabState, getAppState);
    return {
      ...state,
      closedAt: tabState.closedAt,
    };
  };

  const getDefinedStateOnly = <T>(state: T | undefined): T | undefined => {
    if (!state || !Object.keys(state).length) {
      return undefined;
    }
    return state;
  };

  const toTabState = (
    tabStateInStorage: TabStateInLocalStorage,
    defaultTabState: Omit<TabState, keyof TabItem>
  ): TabState => {
    const appState = getDefinedStateOnly(tabStateInStorage.appState);
    const globalState = getDefinedStateOnly(
      tabStateInStorage.globalState || defaultTabState.lastPersistedGlobalState
    );
    return {
      ...defaultTabState,
      ...pick(tabStateInStorage, 'id', 'label'),
      initialAppState: appState,
      initialGlobalState: globalState,
      lastPersistedGlobalState: globalState || {},
    };
  };

  const toRecentlyClosedTabState = (
    tabStateInStorage: RecentlyClosedTabStateInLocalStorage,
    defaultTabState: Omit<TabState, keyof TabItem>
  ): RecentlyClosedTabState => ({
    ...toTabState(tabStateInStorage, defaultTabState),
    closedAt: tabStateInStorage.closedAt,
  });

  const readFromLocalStorage = (): TabsStateInLocalStorage => {
    const storedTabsState: TabsStateInLocalStorage | undefined =
      storage.get(TABS_LOCAL_STORAGE_KEY);

    return {
      userId: storedTabsState?.userId || '',
      spaceId: storedTabsState?.spaceId || '',
      openTabs: storedTabsState?.openTabs || [],
      closedTabs: storedTabsState?.closedTabs || [],
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
      return tabStateInStorage;
    });
    const closedTabs: TabsStateInLocalStorage['closedTabs'] = recentlyClosedTabs.map((tab) => {
      const tabStateInStorage = toRecentlyClosedTabStateInStorage(tab, getAppState);
      keptTabIds[tab.id] = true;
      return tabStateInStorage;
    });

    const nextTabsInStorage: TabsStateInLocalStorage = {
      userId: sessionInfo.userId,
      spaceId: sessionInfo.spaceId,
      openTabs,
      closedTabs, // wil be used for "Recently closed tabs" feature
    };

    storage.set(TABS_LOCAL_STORAGE_KEY, nextTabsInStorage);
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
          return {
            ...tab,
            appState: tabStatePartial.appState,
            globalState: tabStatePartial.globalState,
          };
        }
        return tab;
      }),
    };

    if (hasModifications) {
      storage.set(TABS_LOCAL_STORAGE_KEY, updatedTabsState);
    }
  };

  const loadLocally: TabsStorageManager['loadLocally'] = ({
    userId,
    spaceId,
    persistedDiscoverSession,
    defaultTabState,
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

    const closedTabs = storedTabsState.closedTabs.map((tab) =>
      toRecentlyClosedTabState(tab, defaultTabState)
    );

    if (persistedDiscoverSession) {
      const openTabs = persistedDiscoverSession.tabs.map((rawTab) => {
        const mappedTab: TabStateInLocalStorage = {
          id: rawTab.id,
          label: rawTab.label,
          appState: {
            columns: rawTab.columns,
            filters: rawTab.serializedSearchSource.filter,
            grid: rawTab.grid,
            hideChart: rawTab.hideChart,
            dataSource: isOfAggregateQueryType(rawTab.serializedSearchSource.query)
              ? createEsqlDataSource()
              : typeof rawTab.serializedSearchSource.index === 'string'
              ? createDataViewDataSource({
                  dataViewId: rawTab.serializedSearchSource.index,
                })
              : rawTab.serializedSearchSource.index?.id
              ? createDataViewDataSource({
                  dataViewId: rawTab.serializedSearchSource.index.id,
                })
              : undefined,
            query: rawTab.serializedSearchSource.query,
            sort: rawTab.sort,
            viewMode: rawTab.viewMode,
            hideAggregatedPreview: rawTab.hideAggregatedPreview,
            rowHeight: rawTab.rowHeight,
            headerRowHeight: rawTab.headerRowHeight,
            rowsPerPage: rawTab.rowsPerPage,
            sampleSize: rawTab.sampleSize,
            breakdownField: rawTab.breakdownField,
            density: rawTab.density,
          },
          globalState: {
            timeRange: rawTab.timeRestore ? rawTab.timeRange : undefined,
            refreshInterval: rawTab.timeRange ? rawTab.refreshInterval : undefined,
          },
        };

        return toTabState(mappedTab, defaultTabState);
      });

      if (!enabled) {
        return {
          allTabs: [openTabs[0]],
          selectedTabId: openTabs[0].id,
          recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
        };
      }

      const selectedTab = selectedTabId
        ? openTabs.find((tab) => tab.id === selectedTabId) ?? openTabs[0]
        : openTabs[0];

      return {
        allTabs: openTabs,
        selectedTabId: selectedTab.id,
        recentlyClosedTabs: getNRecentlyClosedTabs(closedTabs, openTabs),
      };
    }

    const openTabs = storedTabsState.openTabs.map((tab) => toTabState(tab, defaultTabState));

    if (enabled) {
      if (selectedTabId) {
        // restore previously opened tabs
        if (openTabs.find((tab) => tab.id === selectedTabId)) {
          return {
            allTabs: openTabs,
            selectedTabId,
            recentlyClosedTabs: closedTabs,
          };
        }

        const storedClosedTab = storedTabsState.closedTabs.find((tab) => tab.id === selectedTabId);

        if (storedClosedTab) {
          // restore previously closed tabs, for example when only the default tab was shown
          return {
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

    return {
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
    getNRecentlyClosedTabs,
  };
};
