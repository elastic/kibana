/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { History } from 'history';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { type DataView, DataViewType } from '@kbn/data-views-plugin/public';
import { SavedSearch, getSavedSearch } from '@kbn/saved-search-plugin/public';
import { buildStateSubscribe } from './utils/build_state_subscribe';
import { changeDataView } from './utils/change_data_view';
import { useSearchSession } from './use_search_session';
import { FetchStatus } from '../../types';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { useUrlTracking } from './use_url_tracking';
import { getDiscoverStateContainer } from '../services/discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { DataTableRecord } from '../../../types';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { useAdHocDataViews } from './use_adhoc_data_views';

export function useDiscoverState({
  services,
  history,
  savedSearch,
  setExpandedDoc,
}: {
  services: DiscoverServices;
  savedSearch: SavedSearch;
  history: History;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}) {
  const { data, filterManager, dataViews, toastNotifications, trackUiMetric } = services;

  const dataView = savedSearch.searchSource.getField('index')!;

  const searchSource = useMemo(() => {
    savedSearch.searchSource.setField('index', dataView);
    return savedSearch.searchSource.createChild();
  }, [savedSearch, dataView]);

  const stateContainer = useMemo(() => {
    const container = getDiscoverStateContainer({
      history,
      savedSearch,
      services,
    });
    const nextDataView = savedSearch.searchSource.getField('index')!;
    container.actions.setDataView(nextDataView);
    if (!nextDataView.isPersisted()) {
      container.actions.appendAdHocDataViews(nextDataView);
    }
    return container;
  }, [history, savedSearch, services]);

  const { setUrlTracking } = useUrlTracking(savedSearch, dataView);

  const { appState, searchSessionManager } = stateContainer;

  const [state, setState] = useState(appState.getState());

  /**
   * Search session logic
   */
  useSearchSession({ services, stateContainer, savedSearch });

  /**
   * Adhoc data views functionality
   */
  const isTextBasedMode = state?.query && isOfAggregateQueryType(state?.query);
  const { persistDataView, updateAdHocDataViewId } = useAdHocDataViews({
    dataView,
    dataViews,
    stateContainer,
    savedSearch,
    setUrlTracking,
    filterManager,
    toastNotifications,
    trackUiMetric,
    isTextBasedMode,
  });

  /**
   * Updates data views selector state
   */
  const updateDataViewList = useCallback(
    async (newAdHocDataViews: DataView[]) => {
      await stateContainer.actions.loadDataViewList();
      stateContainer.actions.setAdHocDataViews(newAdHocDataViews);
    },
    [stateContainer.actions]
  );

  /**
   * Data fetching logic
   */
  const { data$, refetch$, reset, inspectorAdapters, initialFetchStatus } =
    stateContainer.dataState;
  /**
   * State changes (data view, columns), when a text base query result is returned
   */
  useTextBasedQueryLanguage({
    documents$: data$.documents$,
    dataViews,
    stateContainer,
    savedSearch,
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
    const stopSync = stateContainer.initializeAndSync(dataView, filterManager, data);
    setState(stateContainer.appState.getState());

    return () => stopSync();
  }, [stateContainer, filterManager, data, dataView]);

  /**
   * Data store subscribing to trigger fetching
   */
  useEffect(() => {
    const stopSync = stateContainer.dataState.subscribe();
    return () => stopSync();
  }, [stateContainer]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = appState.subscribe(
      buildStateSubscribe({ stateContainer, savedSearch, setState })
    );
    return () => unsubscribe();
  }, [appState, savedSearch, services, stateContainer]);

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      await changeDataView(id, { services, discoverState: stateContainer, setUrlTracking });
      setExpandedDoc(undefined);
    },
    [services, setExpandedDoc, setUrlTracking, stateContainer]
  );

  /**
   * function to revert any changes to a given saved search
   */
  const resetSavedSearch = useCallback(
    async (id?: string) => {
      const newSavedSearch = await getSavedSearch(id, {
        search: services.data.search,
        savedObjectsClient: services.core.savedObjects.client,
        spaces: services.spaces,
        savedObjectsTagging: services.savedObjectsTagging,
      });

      const newDataView = newSavedSearch.searchSource.getField('index') || dataView;
      newSavedSearch.searchSource.setField('index', newDataView);
      const newAppState = getStateDefaults({
        savedSearch: newSavedSearch,
        services,
      });

      restoreStateFromSavedSearch({
        savedSearch: newSavedSearch,
        timefilter: services.timefilter,
      });

      await stateContainer.replaceUrlAppState(newAppState);
      setState(newAppState);
    },
    [services, dataView, stateContainer]
  );

  /**
   * Function triggered when the user changes the query in the search bar
   */
  const onUpdateQuery = useCallback(
    (_payload, isUpdate?: boolean) => {
      if (isUpdate === false) {
        searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
        refetch$.next(undefined);
      }
    },
    [refetch$, searchSessionManager]
  );

  /**
   * Trigger data fetching on dataView or savedSearch changes
   */
  useEffect(() => {
    if (dataView && initialFetchStatus === FetchStatus.LOADING) {
      refetch$.next(undefined);
    }
  }, [initialFetchStatus, refetch$, dataView, savedSearch.id]);

  /**
   * We need to make sure the auto refresh interval is disabled for
   * non-time series data or rollups since we don't show the date picker
   */
  useEffect(() => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      stateContainer.pauseAutoRefreshInterval();
    }
  }, [dataView, stateContainer]);

  return {
    inspectorAdapters,
    resetSavedSearch,
    onChangeDataView,
    onUpdateQuery,
    searchSource,
    stateContainer,
    persistDataView,
    updateAdHocDataViewId,
    searchSessionManager,
    updateDataViewList,
  };
}
