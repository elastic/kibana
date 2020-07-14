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
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '../../../../kibana_utils/public';
import { QuerySetup, QueryStart } from '../query_service';
import { connectToQueryState } from './connect_to_query_state';
import { QueryState } from './types';
import { FilterStateStore } from '../../../common/es_query/filters';

const GLOBAL_STATE_STORAGE_KEY = '_g';

/**
 * Helper to setup syncing of global data with the URL
 * @param QueryService: either setup or start
 * @param kbnUrlStateStorage to use for syncing
 */
export const syncQueryStateWithUrl = (
  query: Pick<QueryStart | QuerySetup, 'filterManager' | 'timefilter' | 'state$'>,
  kbnUrlStateStorage: IKbnUrlStateStorage
) => {
  const {
    timefilter: { timefilter },
    filterManager,
  } = query;
  const defaultState: QueryState = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  // retrieve current state from `_g` url
  const initialStateFromUrl = kbnUrlStateStorage.get<QueryState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there was info in the URL
  const hasInheritedQueryFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  // prepare initial state, whatever was in URL takes precedences over current state in services
  const initialState: QueryState = {
    ...defaultState,
    ...initialStateFromUrl,
  };

  const globalQueryStateContainer = createStateContainer(initialState);
  const stopSyncingWithStateContainer = connectToQueryState(query, globalQueryStateContainer, {
    refreshInterval: true,
    time: true,
    filters: FilterStateStore.GLOBAL_STATE,
  });

  // if there weren't any initial state in url,
  // then put _g key into url
  if (!initialStateFromUrl) {
    kbnUrlStateStorage.set<QueryState>(GLOBAL_STATE_STORAGE_KEY, initialState, {
      replace: true,
    });
  }

  // trigger initial syncing from state container to services if needed
  globalQueryStateContainer.set(initialState);

  const { start, stop: stopSyncingWithUrl } = syncState({
    stateStorage: kbnUrlStateStorage,
    stateContainer: {
      ...globalQueryStateContainer,
      set: (state) => {
        if (state) {
          // syncState utils requires to handle incoming "null" value
          globalQueryStateContainer.set(state);
        }
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
