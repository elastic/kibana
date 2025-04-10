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
import { TABS_STATE_URL_KEY } from '../../../../common/constants';

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
  pushSelectedTabIdToUrl: (selectedTabId: string) => Promise<void>;
}

export const getTabsStorageManager = ({
  urlStateStorage,
  onChanged,
}: {
  urlStateStorage: IKbnUrlStateStorage;
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

  const pushSelectedTabIdToUrl = async (selectedTabId: string) => {
    await urlStateStorage.set(TABS_STATE_URL_KEY, { selectedTabId }); // can be called even before sync with URL started
  };

  return {
    urlStateContainer,
    startUrlSync,
    pushSelectedTabIdToUrl,
  };
};
