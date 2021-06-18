/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { cloneDeep } from 'lodash';
import { History } from 'history';
import { getState } from './discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import {
  esFilters,
  connectToQueryState,
  syncQueryStateWithUrl,
  IndexPattern,
} from '../../../../../../data/public';
import { DiscoverServices } from '../../../../build_services';
import { SavedSearch } from '../../../../saved_searches';
import { loadIndexPattern } from '../utils/resolve_index_pattern';

export function useDiscoverState({
  services,
  history,
  initialIndexPattern,
  initialSavedSearch,
}: {
  services: DiscoverServices;
  initialSavedSearch: SavedSearch;
  history: History;
  initialIndexPattern: IndexPattern;
}) {
  const { uiSettings: config, data, filterManager } = services;
  const [indexPattern, setIndexPattern] = useState(initialIndexPattern);
  const [savedSearch, setSavedSearch] = useState(initialSavedSearch);

  const searchSource = useMemo(() => {
    savedSearch.searchSource.setField('index', indexPattern);
    return savedSearch.searchSource.createChild();
  }, [savedSearch.searchSource, indexPattern]);

  const stateContainer = useMemo(
    () =>
      getState({
        getStateDefaults: () =>
          getStateDefaults({
            config,
            data,
            savedSearch,
          }),
        storeInSessionStorage: config.get('state:storeInSessionStorage'),
        history,
        toasts: services.core.notifications.toasts,
        uiSettings: config,
      }),
    [config, data, history, savedSearch, services.core.notifications.toasts]
  );

  const { appStateContainer, getPreviousAppState } = stateContainer;

  const [state, setState] = useState(appStateContainer.getState());

  useEffect(() => {
    if (stateContainer.appStateContainer.getState().index !== indexPattern.id) {
      // used index pattern is different than the given by url/state which is invalid
      stateContainer.setAppState({ index: indexPattern.id });
    }
    // sync initial app filters from state to filterManager
    const filters = appStateContainer.getState().filters;
    if (filters) {
      filterManager.setAppFilters(cloneDeep(filters));
    }
    const query = appStateContainer.getState().query;
    if (query) {
      data.query.queryString.setQuery(query);
    }

    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      appStateContainer,
      {
        filters: esFilters.FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(
      data.query,
      stateContainer.kbnUrlStateStorage
    );
    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
    };
  }, [
    appStateContainer,
    config,
    data.query,
    data.search.session,
    getPreviousAppState,
    indexPattern.id,
    filterManager,
    services.indexPatterns,
    stateContainer,
  ]);

  useEffect(() => {
    const unsubscribe = stateContainer.appStateContainer.subscribe(async (nextState) => {
      // NOTE: this is also called when navigating from discover app to context app
      if (nextState.index && state.index !== nextState.index) {
        const nextIndexPattern = await loadIndexPattern(
          nextState.index,
          services.indexPatterns,
          config
        );

        if (nextIndexPattern) {
          setIndexPattern(nextIndexPattern.loaded);
        }
      }
      setState(nextState);
    });
    return () => unsubscribe();
  }, [config, services.indexPatterns, state.index, stateContainer.appStateContainer, setState]);

  const resetSavedSearch = useCallback(
    async (id?: string) => {
      const newSavedSearch = await services.getSavedSearchById(id);
      newSavedSearch.searchSource.setField('index', indexPattern);
      const newAppState = getStateDefaults({
        config,
        data,
        savedSearch: newSavedSearch,
      });
      await stateContainer.replaceUrlAppState(newAppState);
      setState(newAppState);
      if (savedSearch.id !== newSavedSearch.id) {
        setSavedSearch(newSavedSearch);
      }
    },
    [services, indexPattern, config, data, stateContainer, savedSearch.id]
  );

  return {
    state,
    setState,
    stateContainer,
    indexPattern,
    searchSource,
    savedSearch,
    resetSavedSearch,
  };
}
