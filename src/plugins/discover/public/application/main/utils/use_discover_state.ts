/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { isEqual } from 'lodash';
import { History } from 'history';
import { getState } from '../services/discover_state';
import { getStateDefaults } from './get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch, getSavedSearch } from '../../../services/saved_searches';
import { loadIndexPattern } from './resolve_index_pattern';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../common';
import { useSearchSession } from './use_search_session';
import { FetchStatus } from '../../types';
import { getSwitchIndexPatternAppState } from './get_switch_index_pattern_app_state';
import { SortPairArr } from '../../../components/doc_table/lib/get_sort';
import { ElasticSearchHit } from '../../../types';

export function useDiscoverState({
  services,
  history,
  savedSearch,
  setExpandedDoc,
}: {
  services: DiscoverServices;
  savedSearch: SavedSearch;
  history: History;
  setExpandedDoc: (doc?: ElasticSearchHit) => void;
}) {
  const { uiSettings: config, data, filterManager, indexPatterns, storage } = services;
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const { timefilter } = data.query.timefilter;

  const indexPattern = savedSearch.searchSource.getField('index')!;

  const searchSource = useMemo(() => {
    savedSearch.searchSource.setField('index', indexPattern);
    return savedSearch.searchSource.createChild();
  }, [savedSearch, indexPattern]);

  const stateContainer = useMemo(
    () =>
      getState({
        getStateDefaults: () =>
          getStateDefaults({
            config,
            data,
            savedSearch,
            storage,
          }),
        storeInSessionStorage: config.get('state:storeInSessionStorage'),
        history,
        toasts: services.core.notifications.toasts,
        uiSettings: config,
      }),
    [config, data, history, savedSearch, services.core.notifications.toasts, storage]
  );

  const { appStateContainer } = stateContainer;

  const [state, setState] = useState(appStateContainer.getState());

  /**
   * Search session logic
   */
  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  const initialFetchStatus: FetchStatus = useMemo(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    const shouldSearchOnPageLoad =
      config.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL();
    return shouldSearchOnPageLoad ? FetchStatus.LOADING : FetchStatus.UNINITIALIZED;
  }, [config, savedSearch.id, searchSessionManager, timefilter]);

  /**
   * Data fetching logic
   */
  const { data$, refetch$, reset, inspectorAdapters } = useSavedSearchData({
    initialFetchStatus,
    searchSessionManager,
    savedSearch,
    searchSource,
    services,
    stateContainer,
    useNewFieldsApi,
  });

  /**
   * Reset to display loading spinner when savedSearch is changing
   */
  useEffect(() => reset(), [savedSearch.id, reset]);

  /**
   * Sync URL state with local app state on saved search load
   * or dataView / savedSearch switch
   */
  useEffect(() => {
    const stopSync = stateContainer.initializeAndSync(indexPattern, filterManager, data);
    setState(stateContainer.appStateContainer.getState());

    return () => stopSync();
  }, [stateContainer, filterManager, data, indexPattern]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = appStateContainer.subscribe(async (nextState) => {
      const { hideChart, interval, sort, index } = state;
      // chart was hidden, now it should be displayed, so data is needed
      const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
      const chartIntervalChanged = nextState.interval !== interval;
      const docTableSortChanged = !isEqual(nextState.sort, sort);
      const indexPatternChanged = !isEqual(nextState.index, index);
      // NOTE: this is also called when navigating from discover app to context app
      if (nextState.index && indexPatternChanged) {
        /**
         *  Without resetting the fetch state, e.g. a time column would be displayed when switching
         *  from a index pattern without to a index pattern with time filter for a brief moment
         *  That's because appState is updated before savedSearchData$
         *  The following line of code catches this, but should be improved
         */
        const nextIndexPattern = await loadIndexPattern(nextState.index, indexPatterns, config);
        savedSearch.searchSource.setField('index', nextIndexPattern.loaded);

        reset();
      }

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next();
      }
      setState(nextState);
    });
    return () => unsubscribe();
  }, [
    config,
    indexPatterns,
    appStateContainer,
    setState,
    state,
    refetch$,
    data$,
    reset,
    savedSearch.searchSource,
  ]);

  /**
   * function to revert any changes to a given saved search
   */
  const resetSavedSearch = useCallback(
    async (id?: string) => {
      const newSavedSearch = await getSavedSearch(id, {
        search: services.data.search,
        savedObjectsClient: services.core.savedObjects.client,
        spaces: services.spaces,
      });

      const newIndexPattern = newSavedSearch.searchSource.getField('index') || indexPattern;
      newSavedSearch.searchSource.setField('index', newIndexPattern);
      const newAppState = getStateDefaults({
        config,
        data,
        savedSearch: newSavedSearch,
        storage,
      });
      await stateContainer.replaceUrlAppState(newAppState);
      setState(newAppState);
    },
    [services, indexPattern, config, data, storage, stateContainer]
  );

  /**
   * Function triggered when user changes index pattern in the sidebar
   */
  const onChangeIndexPattern = useCallback(
    async (id: string) => {
      const nextIndexPattern = await indexPatterns.get(id);
      if (nextIndexPattern && indexPattern) {
        const nextAppState = getSwitchIndexPatternAppState(
          indexPattern,
          nextIndexPattern,
          state.columns || [],
          (state.sort || []) as SortPairArr[],
          config.get(MODIFY_COLUMNS_ON_SWITCH),
          config.get(SORT_DEFAULT_ORDER_SETTING)
        );
        stateContainer.setAppState(nextAppState);
      }
      setExpandedDoc(undefined);
    },
    [config, indexPattern, indexPatterns, setExpandedDoc, state.columns, state.sort, stateContainer]
  );
  /**
   * Function triggered when the user changes the query in the search bar
   */
  const onUpdateQuery = useCallback(
    (_payload, isUpdate?: boolean) => {
      if (isUpdate === false) {
        searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
        refetch$.next();
      }
    },
    [refetch$, searchSessionManager]
  );

  /**
   * Trigger data fetching on indexPattern or savedSearch changes
   */
  useEffect(() => {
    if (indexPattern) {
      refetch$.next();
    }
  }, [initialFetchStatus, refetch$, indexPattern, savedSearch.id]);

  return {
    data$,
    indexPattern,
    inspectorAdapters,
    refetch$,
    resetSavedSearch,
    onChangeIndexPattern,
    onUpdateQuery,
    searchSource,
    setState,
    state,
    stateContainer,
  };
}
