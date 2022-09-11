/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import { History } from 'history';
import { DataViewType } from '@kbn/data-views-plugin/public';
import {
  AggregateQuery,
  getIndexPatternFromSQLQuery,
  isOfAggregateQueryType,
  Query,
} from '@kbn/es-query';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { getState } from '../services/discover_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { loadDataView } from '../utils/resolve_data_view';
import { DataDocumentsMsg, useSavedSearch as useSavedSearchData } from './use_saved_search';
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
import { DataTableRecord } from '../../../types';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { updateSavedSearch } from '../utils/persist_saved_search';

const MAX_NUM_OF_COLUMNS = 50;

export function useDiscoverState({
  services,
  history,
  initialSavedSearch,
  setExpandedDoc,
}: {
  services: DiscoverServices;
  initialSavedSearch: SavedSearch;
  history: History;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}) {
  const { uiSettings: config, data, filterManager, dataViews, storage } = services;
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);
  const { timefilter } = data.query.timefilter;
  const [savedSearch, setSavedSearch] = useState({ ...initialSavedSearch });
  const hasSavedSearchChanged = useMemo(() => {
    return !isEqual(savedSearch, initialSavedSearch);
  }, [savedSearch, initialSavedSearch]);

  useEffect(() => {
    setSavedSearch(initialSavedSearch);
  }, [initialSavedSearch]);

  const stateContainer = useMemo(
    () =>
      getState({
        getStateDefaults: () =>
          getStateDefaults({
            config,
            data,
            savedSearch: initialSavedSearch,
            storage,
          }),
        storeInSessionStorage: config.get('state:storeInSessionStorage'),
        history,
        toasts: services.core.notifications.toasts,
        uiSettings: config,
      }),
    [config, data, history, initialSavedSearch, services.core.notifications.toasts, storage]
  );

  const { appStateContainer } = stateContainer;

  const dataView = useMemo(() => savedSearch.searchSource.getField('index'), [savedSearch]);

  const [documentStateCols, setDocumentStateCols] = useState<string[]>([]);
  const [sqlQuery] = useState<AggregateQuery | Query | undefined>(
    savedSearch.searchSource.getField('query')
  );

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
    services,
    stateContainer,
    useNewFieldsApi,
  });

  const documentState: DataDocumentsMsg = useDataState(data$.documents$);

  /**
   * Sync URL state with local app state on saved search load
   * or savedSearch switch
   */
  useEffect(() => {
    const stopSync = stateContainer.initializeAndSync(
      savedSearch.searchSource.getField('index')!,
      filterManager,
      data
    );
    return () => stopSync();
  }, [stateContainer, filterManager, data, savedSearch.searchSource]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const unsubscribe = appStateContainer.subscribe(async (nextState, prevState) => {
      const { hideChart, interval, sort, index } = prevState;
      // chart was hidden, now it should be displayed, so data is needed
      const chartDisplayChanged = nextState.hideChart !== hideChart && hideChart;
      const chartIntervalChanged = nextState.interval !== interval;
      const docTableSortChanged = !isEqual(nextState.sort, sort);
      const dataViewChanged = !isEqual(nextState.index, index);
      let nextDataView = dataView;

      if (nextState.index && dataViewChanged) {
        // NOTE: this is also called when navigating from discover app to context app
        const result = await loadDataView(nextState.index!, dataViews, config);
        if (result.loaded) {
          nextDataView = result.loaded;
        }
      }

      const nextSavedSearch = updateSavedSearch(savedSearch, {
        dataView: nextDataView!,
        services,
        state: nextState,
      });

      if (dataViewChanged) {
        if (initialFetchStatus === FetchStatus.LOADING) {
          refetch$.next('reset');
        } else {
          reset();
        }
      } else if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged) {
        refetch$.next(undefined);
      }
      setSavedSearch(nextSavedSearch);
    });
    return () => unsubscribe();
  }, [
    config,
    dataView,
    dataViews,
    appStateContainer,
    refetch$,
    data$,
    reset,
    savedSearch.id,
    savedSearch,
    services,
    initialFetchStatus,
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
        savedObjectsTagging: services.savedObjectsTagging,
      });

      const newDataView =
        newSavedSearch.searchSource.getField('index') || savedSearch.searchSource.getField('index');
      newSavedSearch.searchSource.setField('index', newDataView);
      const newAppState = getStateDefaults({
        config: services.uiSettings,
        data: services.data,
        savedSearch: newSavedSearch,
        storage,
      });

      restoreStateFromSavedSearch({
        savedSearch: newSavedSearch,
        timefilter: services.timefilter,
      });
      await stateContainer.replaceUrlAppState(newAppState);
      setSavedSearch(newSavedSearch);
    },
    [services, savedSearch.searchSource, storage, stateContainer]
  );

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = useCallback(
    async (id: string) => {
      const nextDataView = await dataViews.get(id);
      const prevDataView = dataView;
      const prevState = stateContainer.appStateContainer.getState();
      if (nextDataView && prevDataView) {
        const nextAppState = getDataViewAppState(
          prevDataView,
          nextDataView,
          prevState.columns || [],
          (prevState.sort || []) as SortOrder[],
          config.get(MODIFY_COLUMNS_ON_SWITCH),
          config.get(SORT_DEFAULT_ORDER_SETTING),
          prevState.query
        );
        stateContainer.setAppState(nextAppState);
      }
      setExpandedDoc(undefined);
    },
    [config, dataView, dataViews, setExpandedDoc, stateContainer]
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
    refetch$.next(undefined);
  }, [initialFetchStatus, refetch$, savedSearch.id]);

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
      if (
        !isEqual(columns, documentStateCols) &&
        !isEqual(savedSearch.searchSource.getField('query'), sqlQuery)
      ) {
        return columns;
      }
      return [];
    }
    return [];
  }, [
    documentState.fetchStatus,
    documentState.result,
    documentStateCols,
    savedSearch.searchSource,
    sqlQuery,
  ]);

  useEffect(() => {
    async function fetchDataview() {
      const query = savedSearch.searchSource.getField('query');
      if (query && isOfAggregateQueryType(query) && 'sql' in query) {
        const indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
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
    savedSearch,
    inspectorAdapters,
    refetch$,
    resetSavedSearch,
    onChangeDataView,
    onUpdateQuery,
    stateContainer,
    hasSavedSearchChanged,
  };
}
