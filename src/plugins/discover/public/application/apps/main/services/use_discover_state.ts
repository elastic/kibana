/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback, useContext } from 'react';
import { isEqual } from 'lodash';
import { History } from 'history';
import { getState } from './discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { DiscoverServices } from '../../../../build_services';
import { SavedSearch } from '../../../../saved_searches';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';
import { useSearchSession } from './use_search_session';
import { DiscoverContext } from './discover_context';
import { IndexPattern } from '../../../../../../data_views/common';

export function useDiscoverState({
  services,
  history,
  savedSearch,
}: {
  services: DiscoverServices;
  savedSearch: SavedSearch;
  history: History;
}) {
  const { uiSettings: config, data } = services;
  const {
    dataViews: { get },
  } = useContext(DiscoverContext);

  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const [indexPattern, setIndexPattern] = useState<IndexPattern | undefined>();
  const searchSource = useMemo(() => savedSearch.searchSource.createChild(), [savedSearch]);

  const stateContainer = useMemo(() => getState({ history, services }), [services, history]);
  const [state, setState] = useState(stateContainer.appStateContainer.getState());

  const { appStateContainer } = stateContainer;

  /**
   * Load index pattern
   */
  useEffect(() => {
    const loadIndexPattern = async () => {
      if (!savedSearch?.searchSource.getField('index')) {
        const { index, timefield } = appStateContainer.getState();
        const loadedIndexPattern = await get(
          index ?? services.uiSettings.get('defaultIndex'),
          timefield ?? ''
        );
        savedSearch.searchSource.setField('index', loadedIndexPattern);
        setIndexPattern(loadedIndexPattern);
      } else if (savedSearch?.searchSource.getField('index')) {
        setIndexPattern(savedSearch?.searchSource.getField('index'));
      }
    };
    loadIndexPattern();
  }, [appStateContainer, get, savedSearch.searchSource, services.uiSettings]);

  /**
   * Search session logic
   */
  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  /**
   * Data fetching logic
   */
  const { data$, refetch$, reset, inspectorAdapters } = useSavedSearchData({
    savedSearch,
    searchSessionManager,
    searchSource,
    services,
    stateContainer,
    useNewFieldsApi,
  });

  /**
   * Start syncing of state to URL of state if searchSource is complete (existing index pattern)
   */
  useEffect(() => {
    if (indexPattern && savedSearch.searchSource.getField('index') === indexPattern) {
      const prevState = stateContainer.appStateContainer.getState();
      const stopSync = stateContainer.initializeAndSync(savedSearch);
      const nextState = stateContainer.appStateContainer.getState();
      if (!isEqual(prevState, nextState)) {
        setState(nextState);
      }
      return () => stopSync();
    }
  }, [stateContainer, savedSearch, setState, indexPattern]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = appStateContainer.subscribe(async (nextState) => {
      const { hideChart, interval, sort, index, timefield } = state;
      // chart was hidden, now it should be displayed, so data is needed
      const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
      const chartIntervalChanged = nextState.interval !== interval;
      const docTableSortChanged = !isEqual(nextState.sort, sort);
      const indexPatternChanged = !isEqual(nextState.index, index);
      const timeFieldChanged = !isEqual(nextState.timefield, timefield);

      // NOTE: this is also called when navigating from discover app to context app
      if (nextState.index && (indexPatternChanged || timeFieldChanged)) {
        /**
         *  Without resetting the fetch state, e.g. a time column would be displayed when switching
         *  from a index pattern without to a index pattern with time filter for a brief moment
         *  That's because appState is updated before savedSearchData$
         *  The following line of code catches this, but should be improved
         */
        const nextIndexPattern = await get(nextState.index, nextState.timefield || '');
        savedSearch.searchSource.setField('index', nextIndexPattern);
        setIndexPattern(nextIndexPattern);
        reset();
      }

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next();
      }
      setState(nextState);
    });
    return () => unsubscribe();
  }, [appStateContainer, get, refetch$, reset, savedSearch.searchSource, state]);

  /**
   * function to revert any changes to a given saved search
   */
  const resetSavedSearch = useCallback(
    async (id?: string) => {
      const newSavedSearch = await services.getSavedSearchById(id);
      const newIndexPattern = newSavedSearch.searchSource.getField('index') || indexPattern;
      newSavedSearch.searchSource.setField('index', newIndexPattern);
      const newAppState = getStateDefaults({
        config,
        data,
        savedSearch: newSavedSearch,
      });
      await stateContainer.replaceUrlAppState(newAppState);
      setState(newAppState);
    },
    [indexPattern, services, config, data, stateContainer]
  );

  /**
   * Function triggered when user changes index pattern in the sidebar
   */
  const onChangeIndexPattern = useCallback(
    async (id: string) => {
      const nextIndexPattern = await get(id, '');
      stateContainer.switchIndexPattern(indexPattern!, nextIndexPattern!);
    },
    [get, indexPattern, stateContainer]
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

  const onChangeTimefield = useCallback(
    (name: string) => {
      stateContainer.setAppState({ timefield: name || undefined });
    },
    [stateContainer]
  );

  /**
   * Trigger data fetching on indexPattern or savedSearch changes
   */
  useEffect(() => {
    if (indexPattern) {
      refetch$.next();
    }
  }, [refetch$, indexPattern, savedSearch.id]);

  return {
    data$,
    indexPattern,
    inspectorAdapters,
    refetch$,
    resetSavedSearch,
    onChangeIndexPattern,
    onChangeTimefield,
    onUpdateQuery,
    searchSource,
    setState,
    state,
    stateContainer,
  };
}
