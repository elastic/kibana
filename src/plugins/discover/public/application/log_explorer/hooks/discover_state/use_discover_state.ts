/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { isEqual } from 'lodash';
import createContainer from 'constate';
import { useHistory } from 'react-router-dom';
import { generateFilters } from '@kbn/data-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { SavedSearch, getSavedSearch } from '@kbn/saved-search-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { getState } from '../../../main/services/discover_state';
import { getStateDefaults } from '../../../main/utils/get_state_defaults';
import { loadDataView } from '../../../main/utils/resolve_data_view';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';
import { getDataViewAppState } from '../../../main/utils/get_switch_data_view_app_state';
import { DataTableRecord } from '../../../../types';
import { useUrl } from '../../../main/hooks/use_url';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { setBreadcrumbsTitle } from '../../../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../../../components/help_menu/help_menu_util';
import { useSavedSearchAliasMatchRedirect } from '../../../../hooks/saved_search_alias_match_redirect';
import { popularizeField } from '../../../../utils/popularize_field';

/**
 * State from "outer" Discover (e.g. not specific to the log explorer mode).
 * This includes data views, filters, saved searches etc.
 **/
export function useDiscoverState({
  savedSearch,
  setExpandedDoc,
}: {
  savedSearch: SavedSearch;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}) {
  const {
    uiSettings: config,
    data,
    filterManager,
    dataViews,
    storage,
    chrome,
    docLinks,
    spaces,
    core: {
      notifications: { toasts },
      savedObjects: { client: savedObjectsClient },
    },
    history,
    trackUiMetric,
    capabilities,
  } = useDiscoverServices();

  const usedHistory = useHistory();

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
        history: usedHistory,
        toasts,
        uiSettings: config,
      }),
    [config, data, usedHistory, savedSearch, toasts, storage]
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
        search: data.search,
        savedObjectsClient,
        spaces,
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
    [dataView, config, data, storage, stateContainer, spaces, savedObjectsClient]
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
          (state.sort || []) as SortOrder[],
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

  const onDataViewCreated = useCallback(
    (newDataView: DataView) => {
      if (newDataView.id) {
        onChangeDataView(newDataView.id);
      }
    },
    [onChangeDataView]
  );

  /**
   * Url / Routing logic
   */
  useUrl({ history: usedHistory, resetSavedSearch });

  /**
   * SavedSearch dependant initialisation
   */
  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);
    setBreadcrumbsTitle(savedSearch, chrome);
    return () => {
      data.search.session.clear();
    };
  }, [savedSearch, chrome, docLinks, stateContainer, data, config]);

  /**
   * Initializing syncing with state and help menu
   */
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [stateContainer, chrome, docLinks]);

  const resetCurrentSavedSearch = useCallback(() => {
    resetSavedSearch(savedSearch.id);
  }, [resetSavedSearch, savedSearch]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  const navigateTo = useCallback(
    (path: string) => {
      usedHistory.push(`/log-explorer${path}`);
    },
    [usedHistory]
  );

  // Filters
  const onAddFilter = useCallback(
    (field: DataViewField | string | undefined, values: unknown, operation: '+' | '-') => {
      if (field == null) {
        return;
      }

      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(dataView, fieldName, dataViews, capabilities);
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      return filterManager.addFilters(newFilters);
    },
    [filterManager, dataView, dataViews, trackUiMetric, capabilities]
  );

  const onDisableFilters = useCallback(() => {
    const disabledFilters = filterManager
      .getFilters()
      .map((filter) => ({ ...filter, meta: { ...filter.meta, disabled: true } }));
    filterManager.setFilters(disabledFilters);
  }, [filterManager]);

  return {
    dataView,
    resetSavedSearch,
    onChangeDataView,
    onDataViewCreated,
    onAddFilter,
    onDisableFilters,
    searchSource,
    setState,
    state,
    stateContainer,
    navigateTo,
    resetCurrentSavedSearch,
  };
}

export const [DiscoverStateProvider, useDiscoverStateContext] = createContainer(useDiscoverState);
