/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import { QuerySetup, QueryStart } from '../query_service';
import { connectToQueryState } from './connect_to_query_state';
import { QueryState } from './types';
import { FilterStateStore } from '../../../common';

const GLOBAL_STATE_STORAGE_KEY = '_g';

/**
 * Helper to setup syncing of global data with the URL
 * @param QueryService: either setup or start
 * @param kbnUrlStateStorage to use for syncing
 */
export const syncQueryStateWithUrl = (
  query: Pick<QueryStart | QuerySetup, 'filterManager' | 'timefilter' | 'queryString' | 'state$'>,
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
