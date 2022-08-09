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
import { getState } from '../../main/services/discover_state';
import { getStateDefaults } from '../../main/utils/get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch, getSavedSearch } from '../../../services/saved_searches';
import { loadDataView } from '../../main/utils/resolve_data_view';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { getDataViewAppState } from '../../main/utils/get_switch_data_view_app_state';
import { SortPairArr } from '../../../components/doc_table/utils/get_sort';
import { DataTableRecord } from '../../../types';

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
      const { index } = state;
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
      }

      setState(nextState);
    });
    return () => unsubscribe();
  }, [config, dataViews, appStateContainer, setState, state, savedSearch.searchSource]);

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

  return {
    dataView,
    resetSavedSearch,
    onChangeDataView,
    searchSource,
    setState,
    state,
    stateContainer,
  };
}
