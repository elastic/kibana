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
import { addLog } from '../../../utils/addLog';
import { updateSavedSearch } from '../utils/persist_saved_search';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { getDiscoverStateContainer } from '../services/discover_state';
import { useUrlTracking } from './use_url_tracking';
import { DiscoverServices } from '../../../build_services';
import { loadDataView } from '../utils/resolve_data_view';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { useSearchSession } from './use_search_session';
import { getDataViewAppState } from '../utils/get_switch_data_view_app_state';
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
  const { uiSettings, dataViews } = services;

  const [savedSearch, setSavedSearch] = useState(rootSavedSearch);
  const dataView = useMemo(() => savedSearch.searchSource.getField('index')!, [savedSearch]);

  const { setUrlTracking } = useUrlTracking(savedSearch, dataView);

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

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      addLog('Change data view start', id);
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
        addLog('Change data view next app state', nextAppState);
        stateContainer.setAppState(nextAppState);
        setUrlTracking(nextDataView);
      }
      setExpandedDoc(undefined);
    },
    [stateContainer, dataViews, setExpandedDoc, uiSettings, setUrlTracking]
  );

  /**
   * Adhoc data views functionality
   */
  const { adHocDataViewList, persistDataView, updateAdHocDataViewId } = useAdHocDataViews({
    dataView,
    dataViews,
    stateContainer,
    savedSearch,
    onChangeDataView,
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
    const unsubscribe = stateContainer.appStateContainer.subscribe(async (nextState) => {
      addLog('📦 AppStateContainer.subscribe update', nextState);
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
          await loadDataView(services.dataViews, services.uiSettings, nextState.index)
        ).loaded;
        stateContainer.dataStateContainer.reset();
        savedSearch.searchSource.setField('index', nextDataView);
      }

      updateSavedSearch({ savedSearch, dataView: nextDataView, state: nextState, services });
      stateContainer.savedSearchContainer.set({ ...savedSearch });
      setSavedSearch({ ...savedSearch });
      addLog('AppStateContainer.subscribe update', nextState);

      if (
        dataViewChanged &&
        stateContainer.dataStateContainer.initialFetchStatus === FetchStatus.UNINITIALIZED
      ) {
        return;
      }

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged || dataViewChanged) {
        addLog('📦 AppStateContainer update triggers data fetching');
        refetch$.next(undefined);
      }
    });
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
    onChangeDataView,
    stateContainer,
    adHocDataViewList,
    persistDataView,
    updateAdHocDataViewId,
  };
}
