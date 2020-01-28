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

import {
  IKbnUrlStateStorage,
  syncState,
  createStateContainer,
} from '../../../../kibana_utils/public';
import { QueryStart } from '../query_service';
import { connectToQueryGlobalState, QueryGlobalState } from './connect_to_global_state';

const GLOBAL_STATE_STORAGE_KEY = '_g';

/**
 * Helper utility to sync global data from query services with url ('_g' query param)
 * @param QueryStart
 * @param kbnUrlStateStorage - url storage to use
 */
export const syncGlobalQueryStateWithUrl = (
  query: QueryStart,
  kbnUrlStateStorage: IKbnUrlStateStorage
) => {
  const {
    timefilter: { timefilter },
    filterManager,
  } = query;
  const defaultState: QueryGlobalState = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  // retrieve current state from `_g` url
  const initialStateFromUrl = kbnUrlStateStorage.get<QueryGlobalState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there were info in the URL
  const hasInheritedQueryFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  // prepare initial state, whatever was in URL takes precedences over current state in services
  const initialState: QueryGlobalState = {
    ...defaultState,
    ...initialStateFromUrl,
  };

  const globalQueryStateContainer = createStateContainer(initialState);
  const stopSyncingWithStateContainer = connectToQueryGlobalState(query, globalQueryStateContainer);

  // if there weren't any initial state in url,
  // then put _g key into url
  if (!initialStateFromUrl) {
    kbnUrlStateStorage.set<QueryGlobalState>(GLOBAL_STATE_STORAGE_KEY, initialState, {
      replace: true,
    });
  }

  // trigger initial syncing from state container to services if needed
  globalQueryStateContainer.set(initialState);

  const { start, stop: stopSyncingWithUrl } = syncState({
    stateStorage: kbnUrlStateStorage,
    stateContainer: {
      ...globalQueryStateContainer,
      set: state => {
        globalQueryStateContainer.set(state || defaultState);
      },
    },
    storageKey: GLOBAL_STATE_STORAGE_KEY,
  });

  start();
  return {
    stop: () => {
      stopSyncingWithStateContainer();
      stopSyncingWithUrl();
    },
    hasInheritedQueryFromUrl,
  };
};
