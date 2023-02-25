/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useCallback } from 'react';
import { type DataView, DataViewType } from '@kbn/data-views-plugin/public';
import { changeDataView } from './utils/change_data_view';
import { useSearchSession } from './use_search_session';
import { FetchStatus } from '../../types';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { useUrlTracking } from './use_url_tracking';
import { DiscoverStateContainer } from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import { useAdHocDataViews } from './use_adhoc_data_views';

export function useDiscoverState({
  services,
  stateContainer,
}: {
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}) {
  const { filterManager, dataViews, toastNotifications, trackUiMetric } = services;
  const savedSearch = stateContainer.savedSearchState.get();

  const dataView = savedSearch.searchSource.getField('index')!;

  const { setUrlTracking } = useUrlTracking(savedSearch, dataView);

  const { searchSessionManager } = stateContainer;

  /**
   * Search session logic
   */
  useSearchSession({ services, stateContainer });

  /**
   * Adhoc data views functionality
   */
  const { persistDataView } = useAdHocDataViews({
    dataView,
    stateContainer,
    savedSearch,
    filterManager,
    toastNotifications,
    trackUiMetric,
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
  const { data$, refetch$, inspectorAdapters, initialFetchStatus } = stateContainer.dataState;
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
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      await changeDataView(id, { services, discoverState: stateContainer, setUrlTracking });
      if (stateContainer.internalState.getState().expandedDoc) {
        stateContainer.internalState.transitions.setExpandedDoc(undefined);
      }
    },
    [services, setUrlTracking, stateContainer]
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

  useEffect(() => {
    const unsubscribe = stateContainer.initializeAndSync();
    return () => unsubscribe();
  }, [stateContainer]);

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
    onChangeDataView,
    onUpdateQuery,
    stateContainer,
    persistDataView,
    searchSessionManager,
    updateDataViewList,
  };
}
