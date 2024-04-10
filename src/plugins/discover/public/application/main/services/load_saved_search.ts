/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { cloneDeep, isEqual } from 'lodash';
import { getDataViewByTextBasedQueryLang } from '../utils/get_data_view_by_text_based_query_lang';
import { isTextBasedQuery } from '../utils/is_text_based_query';
import { loadAndResolveDataView } from '../utils/resolve_data_view';
import { DiscoverInternalStateContainer } from './discover_internal_state_container';
import { DiscoverDataStateContainer } from './discover_data_state_container';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { DiscoverStateContainer, LoadParams } from './discover_state';
import { addLog } from '../../../utils/add_log';
import { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  getInitialState,
} from './discover_app_state_container';
import { DiscoverGlobalStateContainer } from './discover_global_state_container';
import { DiscoverServices } from '../../../build_services';

interface LoadSavedSearchDeps {
  appStateContainer: DiscoverAppStateContainer;
  dataStateContainer: DiscoverDataStateContainer;
  internalStateContainer: DiscoverInternalStateContainer;
  savedSearchContainer: DiscoverSavedSearchContainer;
  globalStateContainer: DiscoverGlobalStateContainer;
  services: DiscoverServices;
  setDataView: DiscoverStateContainer['actions']['setDataView'];
}

/**
 * Loading persisted saved searches or existing ones and updating services accordingly
 * @param params
 * @param deps
 */
export const loadSavedSearch = async (
  params: LoadParams,
  deps: LoadSavedSearchDeps
): Promise<SavedSearch> => {
  addLog('[discoverState] loadSavedSearch');
  const { savedSearchId, initialAppState } = params ?? {};
  const {
    appStateContainer,
    internalStateContainer,
    savedSearchContainer,
    globalStateContainer,
    services,
  } = deps;

  const appStateExists = !appStateContainer.isEmptyURL();
  const appState = appStateExists ? appStateContainer.getState() : initialAppState;

  // Loading the saved search or creating a new one
  let nextSavedSearch = savedSearchId
    ? await savedSearchContainer.load(savedSearchId)
    : await savedSearchContainer.new(
        await getStateDataView(params, { services, appState, internalStateContainer })
      );

  // Cleaning up the previous state
  services.filterManager.setAppFilters([]);
  services.data.query.queryString.clearQuery();

  // Sync global filters (coming from URL) to filter manager.
  // It needs to be done manually here as `syncGlobalQueryStateWithUrl` is being called after this `loadSavedSearch` function.
  const globalFilters = globalStateContainer?.get()?.filters;
  const shouldUpdateWithGlobalFilters =
    globalFilters?.length && !services.filterManager.getGlobalFilters()?.length;
  if (shouldUpdateWithGlobalFilters) {
    services.filterManager.setGlobalFilters(globalFilters);
  }

  // reset appState in case a saved search with id is loaded and
  // the url is empty so the saved search is loaded in a clean
  // state else it might be updated by the previous app state
  if (!appStateExists) {
    appStateContainer.set({});
  }

  // Update saved search by a given app state (in URL)
  if (appState) {
    if (savedSearchId && appState.index) {
      // This is for the case appState is overwriting the loaded saved search data view
      const savedSearchDataViewId = nextSavedSearch.searchSource.getField('index')?.id;
      const stateDataView = await getStateDataView(params, {
        services,
        appState,
        internalStateContainer,
        savedSearch: nextSavedSearch,
      });
      const dataViewDifferentToAppState = stateDataView.id !== savedSearchDataViewId;
      if (
        !nextSavedSearch.isTextBasedQuery &&
        stateDataView &&
        (dataViewDifferentToAppState || !savedSearchDataViewId)
      ) {
        nextSavedSearch.searchSource.setField('index', stateDataView);
      }
    }
    nextSavedSearch = savedSearchContainer.update({
      nextDataView: nextSavedSearch.searchSource.getField('index'),
      nextState: appState,
    });
  }

  // Update app state container with the next state derived from the next saved search
  const nextAppState = getInitialState(undefined, nextSavedSearch, services);
  const mergedAppState = appState
    ? { ...nextAppState, ...cleanupUrlState({ ...appState }, services.uiSettings) }
    : nextAppState;

  appStateContainer.resetToState(mergedAppState);

  // Update all other services and state containers by the next saved search
  updateBySavedSearch(nextSavedSearch, deps);

  if (!appState && shouldUpdateWithGlobalFilters) {
    nextSavedSearch = savedSearchContainer.updateWithFilterManagerFilters();
  }

  internalStateContainer.transitions.resetOnSavedSearchChange();

  return nextSavedSearch;
};

/**
 * Update services and state containers based on the given saved search
 * @param savedSearch
 * @param deps
 */
function updateBySavedSearch(savedSearch: SavedSearch, deps: LoadSavedSearchDeps) {
  const { dataStateContainer, internalStateContainer, services, setDataView } = deps;
  const savedSearchDataView = savedSearch.searchSource.getField('index')!;

  setDataView(savedSearchDataView);
  if (!savedSearchDataView.isPersisted()) {
    internalStateContainer.transitions.appendAdHocDataViews(savedSearchDataView);
  }

  // Finally notify dataStateContainer, data.query and filterManager about new derived state
  dataStateContainer.reset(savedSearch);
  // set data service filters
  const filters = savedSearch.searchSource.getField('filter');
  if (Array.isArray(filters) && filters.length) {
    // Saved search SO persists all filters as app filters
    services.data.query.filterManager.setAppFilters(cloneDeep(filters));
  }
  // some filters may not be valid for this context, so update
  // the filter manager with a modified list of valid filters
  const currentFilters = services.filterManager.getFilters();
  const validFilters = getValidFilters(savedSearchDataView, currentFilters);
  if (!isEqual(currentFilters, validFilters)) {
    services.filterManager.setFilters(validFilters);
  }

  // set data service query
  const query = savedSearch.searchSource.getField('query');
  if (query) {
    services.data.query.queryString.setQuery(query);
  }
}

// Get the data view to actually use. There are several conditions to consider which data view is used
// 1. If a data view is passed in, use that
// 2. If an appState with index set is passed in, use the data view from that
// 3. If a saved search is passed in, use the data view from that
// And provide a fallback data view if 2. or 3. don't exist, were deleted or invalid
const getStateDataView = async (
  params: LoadParams,
  {
    savedSearch,
    appState,
    services,
    internalStateContainer,
  }: {
    savedSearch?: SavedSearch;
    appState?: DiscoverAppState;
    services: DiscoverServices;
    internalStateContainer: DiscoverInternalStateContainer;
  }
) => {
  const { dataView, dataViewSpec } = params ?? {};
  if (dataView) {
    return dataView;
  }
  const query = appState?.query;

  if (isTextBasedQuery(query)) {
    return await getDataViewByTextBasedQueryLang(query, dataView, services);
  }

  const result = await loadAndResolveDataView(
    {
      id: appState?.index,
      dataViewSpec,
      savedSearch,
      isTextBasedQuery: isTextBasedQuery(appState?.query),
    },
    { services, internalStateContainer }
  );
  return result.dataView;
};
