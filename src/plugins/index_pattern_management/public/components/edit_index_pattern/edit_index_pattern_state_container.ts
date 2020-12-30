/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createHashHistory } from 'history';
import {
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
} from '../../../../../plugins/kibana_utils/public';

interface IEditIndexPatternState {
  tab: string;
}

/**
 * Create state container with sync config for tab navigation specific for edit_index_pattern page
 */
export function createEditIndexPatternPageStateContainer({
  defaultTab,
  useHashedUrl,
}: {
  defaultTab: string;
  useHashedUrl: boolean;
}) {
  const history = createHashHistory();
  // query param to store app state at
  const stateStorageKey = '_a';
  // default app state, when there is no initial state in the url
  const defaultState = {
    tab: defaultTab,
  };
  const kbnUrlStateStorage = createKbnUrlStateStorage({
    useHash: useHashedUrl,
    history,
  });
  // extract starting app state from URL and use it as starting app state in state container
  const initialStateFromUrl = kbnUrlStateStorage.get<IEditIndexPatternState>(stateStorageKey);
  const stateContainer = createStateContainer(
    {
      ...defaultState,
      ...initialStateFromUrl,
    },
    {
      setTab: (state: IEditIndexPatternState) => (tab: string) => ({ ...state, tab }),
    },
    {
      tab: (state: IEditIndexPatternState) => () => state.tab,
    }
  );

  const { start, stop } = syncState({
    storageKey: stateStorageKey,
    stateContainer: {
      ...stateContainer,
      // state syncing utility requires state containers to handle "null"
      set: (state) => state && stateContainer.set(state),
    },
    stateStorage: kbnUrlStateStorage,
  });

  // makes sure initial url is the same as initial state (this is not really required)
  kbnUrlStateStorage.set(stateStorageKey, stateContainer.getState(), { replace: true });

  return {
    startSyncingState: start,
    stopSyncingState: stop,
    setCurrentTab: (newTab: string) => stateContainer.transitions.setTab(newTab),
    getCurrentTab: () => stateContainer.selectors.tab(),
  };
}
