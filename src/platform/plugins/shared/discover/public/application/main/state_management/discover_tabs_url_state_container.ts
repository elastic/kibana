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

export interface DiscoverTabsUrlState {
  selectedTabId?: string; // syncing the selected tab id with the URL
}

export interface DiscoverTabsUrlContainer extends ReduxLikeStateContainer<DiscoverTabsUrlState> {
  startUrlSync: () => () => void;
}

export const getDiscoverTabsUrlStateContainer = ({
  stateStorage,
  onChanged,
}: {
  stateStorage: IKbnUrlStateStorage;
  onChanged: (nextState: DiscoverTabsUrlState) => void;
}): DiscoverTabsUrlContainer => {
  const stateContainer = createStateContainer<DiscoverTabsUrlState>({});

  const startUrlSync = () => {
    const { start, stop } = syncState({
      stateStorage,
      stateContainer: {
        ...stateContainer,
        set: (state) => {
          if (state) {
            // syncState utils requires to handle incoming "null" value
            stateContainer.set(state);
          }
        },
      },
      storageKey: TABS_STATE_URL_KEY,
    });

    const listener = stateContainer.state$.subscribe((state) => {
      onChanged(state);
    });

    start();

    return () => {
      listener.unsubscribe();
      stop();
    };
  };

  return {
    ...stateContainer,
    startUrlSync,
  };
};
