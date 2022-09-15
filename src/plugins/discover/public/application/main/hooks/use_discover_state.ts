/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useCallback, useState } from 'react';
import { isEqual } from 'lodash';
import { History } from 'history';
import { DataViewListItem, DataViewType } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { updateSearchSource } from '../utils/update_search_source';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { getState } from '../services/discover_state';
import { DiscoverServices } from '../../../build_services';
import { loadDataView } from '../utils/resolve_data_view';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../common';
import { useSearchSession } from './use_search_session';
import { FetchStatus } from '../../types';
import { getDataViewAppState } from '../utils/get_switch_data_view_app_state';
import { DataTableRecord } from '../../../types';

export function useDiscoverState({
  services,
  history,
  savedSearch,
  setExpandedDoc,
  dataViewList,
}: {
  services: DiscoverServices;
  savedSearch: SavedSearch;
  history: History;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  dataViewList: DataViewListItem[];
}) {
  const { uiSettings, data, filterManager, dataViews } = services;
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);
  const { timefilter } = data.query.timefilter;

  const [dataView, setDataView] = useState(savedSearch.searchSource.getField('index')!);

  const stateContainer = useMemo(
    () =>
      getState({
        history,
        savedSearch,
        services,
      }),
    [history, savedSearch, services]
  );

  /**
   * Search session logic
   */
  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  const initialFetchStatus: FetchStatus = useMemo(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    const shouldSearchOnPageLoad =
      uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL();
    return shouldSearchOnPageLoad ? FetchStatus.LOADING : FetchStatus.UNINITIALIZED;
  }, [uiSettings, savedSearch.id, searchSessionManager, timefilter]);

  /**
   * Data fetching logic
   */
  const { data$, refetch$, reset, inspectorAdapters } = useSavedSearchData({
    initialFetchStatus,
    searchSessionManager,
    savedSearch,
    services,
    stateContainer,
    useNewFieldsApi,
  });
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
  useEffect(() => reset(), [savedSearch.id, reset]);

  /**
   * Sync URL state with local app state on saved search load
   * or dataView / savedSearch switch
   */
  useEffect(() => {
    const stopSync = stateContainer.initializeAndSync();
    return () => stopSync();
  }, [stateContainer, filterManager, data]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = stateContainer.appStateContainer.subscribe(async (nextState) => {
      const { hideChart, interval, sort, index } = stateContainer.getPreviousAppState();
      // chart was hidden, now it should be displayed, so data is needed
      const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
      const chartIntervalChanged = nextState.interval !== interval;
      const docTableSortChanged = !isEqual(nextState.sort, sort);
      const dataViewChanged = !isEqual(nextState.index, index);
      // NOTE: this is also called when navigating from discover app to context app
      let nextDataView = dataView;
      if (nextState.index && dataViewChanged) {
        /**
         *  Without resetting the fetch state, e.g. a time column would be displayed when switching
         *  from a data view without to a data view with time filter for a brief moment
         *  That's because appState is updated before savedSearchData$
         *  The following line of code catches this, but should be improved
         */
        nextDataView = (
          await loadDataView(nextState.index, services.dataViews, services.uiSettings)
        ).loaded;
        savedSearch.searchSource.setField('index', nextDataView);
        reset();
        setDataView(nextDataView);
      }
      updateSearchSource(savedSearch.searchSource, true, {
        dataView: nextDataView,
        services,
        sort,
        useNewFieldsApi,
      });

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next(undefined);
      }
    });
    return () => unsubscribe();
  }, [
    services,
    refetch$,
    data$,
    reset,
    savedSearch.searchSource,
    stateContainer,
    dataView,
    useNewFieldsApi,
  ]);

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      const prevAppState = stateContainer.appStateContainer.getState();
      const prevDataView = await dataViews.get(prevAppState.index!);
      const nextDataView = await dataViews.get(id);
      if (nextDataView && prevDataView) {
        const nextAppState = getDataViewAppState(
          prevDataView,
          nextDataView,
          prevAppState.columns || [],
          (prevAppState.sort || []) as SortOrder[],
          uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
          uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
          prevAppState.query
        );
        stateContainer.setAppState(nextAppState);
      }
      setExpandedDoc(undefined);
    },
    [uiSettings, dataViews, setExpandedDoc, stateContainer]
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
    if (dataView) {
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

  const fetchQuery = useCallback(
    (resetQuery?: boolean) => {
      if (resetQuery) {
        refetch$.next('reset');
      } else {
        refetch$.next(undefined);
      }
      return refetch$;
    },
    [refetch$]
  );

  return {
    data$,
    dataView,
    inspectorAdapters,
    refetch$,
    fetchQuery,
    onChangeDataView,
    onUpdateQuery,
    stateContainer,
  };
}
