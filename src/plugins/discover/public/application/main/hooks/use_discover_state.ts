/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useMemo, useState } from 'react';
import { History } from 'history';
import { DataViewListItem, DataViewType } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { buildStateSubscribe } from './utiles/build_state_subscribe';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { getDiscoverStateContainer } from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import { useSearchSession } from './use_search_session';
import { DataTableRecord } from '../../../types';
import { FetchStatus } from '../../types';
import { useAdHocDataViews } from './use_adhoc_data_views';

export function useDiscoverState({
  services,
  history,
  savedSearch: rootSavedSearch,
  setExpandedDoc,
  dataViewList,
}: {
  services: DiscoverServices;
  savedSearch: SavedSearch;
  history: History;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  dataViewList: DataViewListItem[];
}) {
  const { dataViews } = services;

  const [savedSearch, setSavedSearch] = useState(rootSavedSearch);
  const dataView = useMemo(() => savedSearch.searchSource.getField('index')!, [savedSearch]);

  const stateContainer = useMemo(
    () =>
      getDiscoverStateContainer({
        history,
        savedSearch: rootSavedSearch,
        services,
      }),
    [history, rootSavedSearch, services]
  );

  /**
   * Search session logic
   */
  useSearchSession({ services, stateContainer, savedSearch });

  useEffect(() => {
    setExpandedDoc(undefined);
  }, [dataView, setExpandedDoc]);

  /**
   * Adhoc data views functionality
   */
  const { adHocDataViewList, persistDataView, updateAdHocDataViewId } = useAdHocDataViews({
    dataView,
    dataViews,
    stateContainer,
    savedSearch,
  });

  /**
   * Data fetching logic
   */
  const { data$, refetch$, inspectorAdapters, subscribe } = stateContainer.dataStateContainer;

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      return unsubscribe();
    };
  }, [subscribe]);
  /**
   * State changes (data view, columns), when a text base query result is returned
   */
  useTextBasedQueryLanguage({
    documents$: data$.documents$,
    dataViews,
    stateContainer,
    dataViewList,
    savedSearch,
  });

  /**
   * Reset to display loading spinner when savedSearch is changing
   */
  useEffect(() => stateContainer.dataStateContainer.reset(), [savedSearch.id, stateContainer]);

  /**
   * Sync URL state with local app state on saved search load
   * or dataView / savedSearch switch
   */
  useEffect(() => {
    const stopSync = stateContainer.initializeAndSync();
    return () => stopSync();
  }, [stateContainer]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = stateContainer.appStateContainer.subscribe(
      buildStateSubscribe({ stateContainer, savedSearch, dataView, services, setSavedSearch })
    );
    return () => unsubscribe();
  }, [dataView, refetch$, savedSearch, services, stateContainer]);

  /**
   * Trigger data fetching on dataView or savedSearch changes
   */
  useEffect(() => {
    if (dataView && stateContainer.dataStateContainer.initialFetchStatus === FetchStatus.LOADING) {
      stateContainer.dataStateContainer.refetch$.next(undefined);
    }
  }, [
    dataView,
    savedSearch.id,
    stateContainer.dataStateContainer.initialFetchStatus,
    stateContainer.dataStateContainer.refetch$,
  ]);

  /**
   * We need to make sure the auto refresh interval is disabled for
   * non-time series data or rollups since we don't show the date picker
   */
  useEffect(() => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      stateContainer.actions.pauseAutoRefreshInterval();
    }
  }, [dataView, stateContainer]);

  return {
    data$,
    dataView,
    inspectorAdapters,
    stateContainer,
    adHocDataViewList,
    persistDataView,
    updateAdHocDataViewId,
  };
}
