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
import type { TabState } from './redux/types';
import { createTabItem } from './redux/utils';

const TABS_LOCAL_STORAGE_KEY = 'discover.tabs';

interface TabStateInLocalStorage {
  tabState: Pick<TabState, 'id' | 'label' | 'dataViewId' | 'appState' | 'globalState'>;
  version: string;
  closedAt?: number; // for future use
}

interface TabsInternalStatePayload {
  allTabs: TabState[];
  selectedTabId: string;
}

export interface TabsStorageState {
  selectedTabId?: string; // syncing the selected tab id with the URL
}

export interface TabsStorageManager {
  /**
   * Supports two-way sync of the selected tab id with the URL.
   * Currently, we use it only one way - from internal state to URL.
   */
  urlStateContainer: ReduxLikeStateContainer<TabsStorageState>;
  startUrlSync: () => () => void;
  persistLocally: (props: TabsInternalStatePayload) => Promise<void>;
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
    return (urlStateStorage.get(TABS_STATE_URL_KEY) as TabsStorageState)?.selectedTabId; // can be called even before sync with URL started
  };

  const pushSelectedTabIdToUrl = async (selectedTabId: string) => {
    await urlStateStorage.set(TABS_STATE_URL_KEY, { selectedTabId }); // can be called even before sync with URL started
  };

  const persistLocally = async ({ allTabs, selectedTabId }: TabsInternalStatePayload) => {
    await pushSelectedTabIdToUrl(selectedTabId);
    const tabsToPersist: TabStateInLocalStorage[] = allTabs.map((tabState) => {
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
    });
    // console.log('stored', tabsToPersist);
    const tabsToPersistString = JSON.stringify(tabsToPersist);
    storage.set(TABS_LOCAL_STORAGE_KEY, tabsToPersistString);
  };

  const loadLocally = ({
    defaultTabState,
  }: {
    defaultTabState: Omit<TabState, keyof TabItem>;
  }): TabsInternalStatePayload => {
    const selectedTabId = getSelectedTabIdFromUrl();
    let allTabs: TabState[] = [];

    // read from storage only if we have selectedTabId in URL
    const tabsFromLocalStorage = selectedTabId ? storage.get(TABS_LOCAL_STORAGE_KEY) : null;

    if (tabsFromLocalStorage) {
      try {
        allTabs = JSON.parse(tabsFromLocalStorage).map(
          (tabStateInStorage: TabStateInLocalStorage) => ({
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
          })
        );
      } catch {
        // suppress error
      }
    }

    // console.log('loaded allTabs', allTabs);

    if (selectedTabId && allTabs.find((tab) => tab.id === selectedTabId)) {
      return {
        allTabs,
        selectedTabId,
      };
    }

    const defaultTab: TabState = {
      ...defaultTabState,
      ...createTabItem([]),
    };

    return {
      allTabs: [defaultTab],
      selectedTabId: defaultTab.id,
    };
  };

  return {
    urlStateContainer,
    startUrlSync,
    persistLocally,
    loadLocally,
  };
};
