/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect } from 'react';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { DiscoverStateContainer } from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import { useSearchSession } from './use_search_session';
import { DataTableRecord } from '../../../types';
import { FetchStatus } from '../../types';
import { useAdHocDataViews } from './use_adhoc_data_views';
import {
  InternalState,
  useInternalStateSelector,
} from '../services/discover_internal_state_container';

export function useDiscoverState({
  services,
  setExpandedDoc,
  stateContainer,
}: {
  services: DiscoverServices;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  stateContainer: DiscoverStateContainer;
}) {
  const { dataViews } = services;
  const dataViewList = useInternalStateSelector((state: InternalState) => state.dataViews);
  const dataView = useInternalStateSelector((state: InternalState) => state.dataView!);

  const savedSearch = useObservable<SavedSearch>(
    stateContainer.savedSearchContainer.savedSearchPersisted$,
    stateContainer.savedSearchContainer.savedSearchPersisted$.getValue()
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
  });

  /**
   * Data fetching logic
   */
  const { data$, inspectorAdapters } = stateContainer.dataStateContainer;

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

  useEffect(() => {
    const unsubscribe = stateContainer.actions.initSyncSubscribe();
    return () => unsubscribe();
  }, [services, stateContainer]);

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
