/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { isEqual } from 'lodash';
import { History } from 'history';
import { DataViewType } from '@kbn/data-views-plugin/public';
import {
  isOfAggregateQueryType,
  getIndexPatternFromSQLQuery,
  AggregateQuery,
  Query,
} from '@kbn/es-query';
import { getState } from '../services/discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch, getSavedSearch } from '../../../services/saved_searches';
import { loadDataView } from '../utils/resolve_data_view';
import { useSavedSearch as useSavedSearchData, DataDocumentsMsg } from './use_saved_search';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../common';
import { useSearchSession } from './use_search_session';
import { useDataState } from './use_data_state';
import { FetchStatus } from '../../types';
import { getDataViewAppState } from '../utils/get_switch_data_view_app_state';
import { SortPairArr } from '../../../components/doc_table/utils/get_sort';
import { DataTableRecord } from '../../../types';

const MAX_NUM_OF_COLUMNS = 50;

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
  const { uiSettings: config, data, filterManager, dataViews, storage } = services;
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const { timefilter } = data.query.timefilter;

  const dataView = savedSearch.searchSource.getField('index')!;

  const searchSource = useMemo(() => {
    savedSearch.searchSource.setField('index', dataView);
    return savedSearch.searchSource.createChild();
  }, [savedSearch, dataView]);

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
  const [documentStateCols, setDocumentStateCols] = useState<string[]>([]);
  const [sqlQuery] = useState<AggregateQuery | Query | undefined>(state.query);
  const prevQuery = usePrevious(state.query);

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

  const documentState: DataDocumentsMsg = useDataState(data$.documents$);

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
    setState(stateContainer.appStateContainer.getState());

    return () => stopSync();
  }, [stateContainer, filterManager, data, dataView]);

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
      const dataViewChanged = !isEqual(nextState.index, index);
      // NOTE: this is also called when navigating from discover app to context app
      if (nextState.index && dataViewChanged) {
        /**
         *  Without resetting the fetch state, e.g. a time column would be displayed when switching
         *  from a data view without to a data view with time filter for a brief moment
         *  That's because appState is updated before savedSearchData$
         *  The following line of code catches this, but should be improved
         */
        const nextDataView = await loadDataView(nextState.index, dataViews, config);
        savedSearch.searchSource.setField('index', nextDataView.loaded);

        reset();
      }

      if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next(undefined);
      }
      setState(nextState);
    });
    return () => unsubscribe();
  }, [
    config,
    dataViews,
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

      const newDataView = newSavedSearch.searchSource.getField('index') || dataView;
      newSavedSearch.searchSource.setField('index', newDataView);
      const newAppState = getStateDefaults({
        config,
        data,
        savedSearch: newSavedSearch,
        storage,
      });
      await stateContainer.replaceUrlAppState(newAppState);
      setState(newAppState);
    },
    [services, dataView, config, data, storage, stateContainer]
  );

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      const nextDataView = await dataViews.get(id);
      if (nextDataView && dataView) {
        const nextAppState = getDataViewAppState(
          dataView,
          nextDataView,
          state.columns || [],
          (state.sort || []) as SortPairArr[],
          config.get(MODIFY_COLUMNS_ON_SWITCH),
          config.get(SORT_DEFAULT_ORDER_SETTING),
          state.query
        );
        stateContainer.setAppState(nextAppState);
      }
      setExpandedDoc(undefined);
    },
    [
      config,
      dataView,
      dataViews,
      setExpandedDoc,
      state.columns,
      state.query,
      state.sort,
      stateContainer,
    ]
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
    if (!isEqual(state.query, prevQuery)) {
      setDocumentStateCols([]);
    }
  }, [state.query, prevQuery]);

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

  const getResultColumns = useCallback(() => {
    if (documentState.result?.length && documentState.fetchStatus === FetchStatus.COMPLETE) {
      const firstRow = documentState.result[0];
      const columns = Object.keys(firstRow.raw).slice(0, MAX_NUM_OF_COLUMNS);
      if (!isEqual(columns, documentStateCols) && !isEqual(state.query, sqlQuery)) {
        return columns;
      }
      return [];
    }
    return [];
  }, [documentState, documentStateCols, sqlQuery, state.query]);

  useEffect(() => {
    async function fetchDataview() {
      if (state.query && isOfAggregateQueryType(state.query) && 'sql' in state.query) {
        const indexPatternFromQuery = getIndexPatternFromSQLQuery(state.query.sql);
        const idsTitles = await dataViews.getIdsWithTitle();
        const dataViewObj = idsTitles.find(({ title }) => title === indexPatternFromQuery);
        if (dataViewObj) {
          const columns = getResultColumns();
          if (columns.length) {
            setDocumentStateCols(columns);
          }
          const nextState = {
            index: dataViewObj.id,
            ...(columns.length && { columns }),
          };
          stateContainer.replaceUrlAppState(nextState);
        }
      }
    }
    fetchDataview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, documentState, dataViews]);

  return {
    data$,
    dataView,
    inspectorAdapters,
    refetch$,
    resetSavedSearch,
    onChangeDataView,
    onUpdateQuery,
    searchSource,
    setState,
    state,
    stateContainer,
  };
}
