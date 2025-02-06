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
  IKbnUrlStateStorage,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { QuerySetup, QueryStart } from '../query_service';
import { connectToQueryState } from './connect_to_query_state';
import { GlobalQueryStateFromUrl } from './types';

const GLOBAL_STATE_STORAGE_KEY = '_g';

/**
 * Helper to sync global query state {@link GlobalQueryStateFromUrl} with the URL (`_g` query param that is preserved between apps)
 * @param QueryService: either setup or start
 * @param kbnUrlStateStorage to use for syncing
 */
export const syncGlobalQueryStateWithUrl = (
  query: Pick<QueryStart | QuerySetup, 'filterManager' | 'timefilter' | 'queryString' | 'state$'>,
  kbnUrlStateStorage: IKbnUrlStateStorage
) => {
  const {
    timefilter: { timefilter },
    filterManager,
  } = query;
  const defaultState: GlobalQueryStateFromUrl = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  // retrieve current state from `_g` url
  const initialStateFromUrl =
    kbnUrlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there was info in the URL
  const hasInheritedQueryFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  // prepare initial state, whatever was in URL takes precedences over current state in services
  const initialState: GlobalQueryStateFromUrl = {
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
    kbnUrlStateStorage.set<GlobalQueryStateFromUrl>(GLOBAL_STATE_STORAGE_KEY, initialState, {
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

/**
 * @deprecated use {@link syncGlobalQueryStateWithUrl} instead
 */
export const syncQueryStateWithUrl = syncGlobalQueryStateWithUrl;
