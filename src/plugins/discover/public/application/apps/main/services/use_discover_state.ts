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
import { getState } from './discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { IndexPattern } from '../../../../../../data/public';
import { DiscoverServices } from '../../../../build_services';
import { SavedSearch } from '../../../../saved_searches';
import { loadIndexPattern } from '../utils/resolve_index_pattern';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../../common';
import { useSearchSession } from './use_search_session';
import { FetchStatus } from '../../../types';
import { getSwitchIndexPatternAppState } from '../utils/get_switch_index_pattern_app_state';
import { SortPairArr } from '../../../angular/doc_table/lib/get_sort';

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
  const { uiSettings: config, data, filterManager, indexPatterns } = services;
  const [indexPattern, setIndexPattern] = useState(initialIndexPattern);
  const [savedSearch, setSavedSearch] = useState(initialSavedSearch);
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const timefilter = data.query.timefilter.timefilter;

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
  const { data$, refetch$, reset } = useSavedSearchData({
    indexPattern,
    initialFetchStatus,
    searchSessionManager,
    searchSource,
    services,
    stateContainer,
    useNewFieldsApi,
  });

  useEffect(() => {
    const stopSync = stateContainer.initializeAndSync(indexPattern, filterManager, data);
    return () => {
      stopSync();
    };
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
        reset();
        const nextIndexPattern = await loadIndexPattern(nextState.index, indexPatterns, config);

        if (nextIndexPattern) {
          setIndexPattern(nextIndexPattern.loaded);
        }
      }

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next();
      }
      setState(nextState);
    });
    return () => unsubscribe();
  }, [config, indexPatterns, appStateContainer, setState, state, refetch$, data$, reset]);

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
    },
    [config, indexPattern, indexPatterns, state.columns, state.sort, stateContainer]
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
   * Initial data fetching, also triggered when index pattern changes
   */
  useEffect(() => {
    if (!indexPattern) {
      return;
    }
    if (initialFetchStatus === FetchStatus.LOADING) {
      refetch$.next();
    }
  }, [initialFetchStatus, refetch$, indexPattern, data$]);

  return {
    data$,
    indexPattern,
    refetch$,
    resetSavedSearch,
    onChangeIndexPattern,
    onUpdateQuery,
    savedSearch,
    searchSource,
    setState,
    state,
    stateContainer,
  };
}
