/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { cloneDeep, isEqual, isObject, pick } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { internalStateSlice, type TabActionPayload } from '../internal_state';
import { getInitialAppState } from '../../utils/get_initial_app_state';
import { type DiscoverAppState } from '..';
import type { DiscoverStateContainer } from '../../discover_state';
import { appendAdHocDataViews } from './data_views';
import { setDataView } from './tab_state_data_view';
import { type AppStateUrl, cleanupUrlState } from '../../utils/cleanup_url_state';
import { getEsqlDataView } from '../../utils/get_esql_data_view';
import { loadAndResolveDataView } from '../../utils/resolve_data_view';
import { isDataViewSource } from '../../../../../../common/data_sources';
import { copySavedSearch } from '../../discover_saved_search_container';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../../../../utils/validate_time';
import { getValidFilters } from '../../../../../utils/get_valid_filters';
import { updateSavedSearch } from '../../utils/update_saved_search';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { selectTabRuntimeState } from '../runtime_state';
import type { ConnectedCustomizationService } from '../../../../../customizations';
import { disconnectTab } from './tabs';
import { selectTab } from '../selectors';
import type { TabState, TabStateGlobalState } from '../types';
import { GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { fromSavedObjectTabToSavedSearch } from '../tab_mapping_utils';
import { createInternalStateAsyncThunk, extractEsqlVariables } from '../utils';
import { fetchData, updateAttributes } from './tab_state';
import { initializeAndSync } from './tab_sync';

export interface InitializeSingleTabsParams {
  stateContainer: DiscoverStateContainer;
  customizationService: ConnectedCustomizationService;
  dataViewSpec: DataViewSpec | undefined;
  esqlControls: ControlPanelsState<OptionsListESQLControlState> | undefined;
  defaultUrlState: DiscoverAppState | undefined;
}

export const initializeSingleTab = createInternalStateAsyncThunk(
  'internalState/initializeSingleTab',
  async function initializeSingleTabThunkFn(
    {
      tabId,
      initializeSingleTabParams: {
        stateContainer,
        customizationService,
        dataViewSpec,
        esqlControls,
        defaultUrlState,
      },
    }: TabActionPayload<{ initializeSingleTabParams: InitializeSingleTabsParams }>,
    {
      dispatch,
      getState,
      extra: { services, runtimeStateManager, urlStateStorage, searchSessionManager },
    }
  ) {
    dispatch(disconnectTab({ tabId }));
    dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId }));

    const { currentDataView$, stateContainer$, customizationService$, scopedEbtManager$ } =
      selectTabRuntimeState(runtimeStateManager, tabId);

    /**
     * New tab initialization with the restored data if available
     */

    let tabInitialGlobalState: TabStateGlobalState | undefined;
    let tabInitialAppState: DiscoverAppState | undefined;
    let tabInitialInternalState: TabState['initialInternalState'] | undefined;

    const tabState = selectTab(getState(), tabId);

    if (tabState.globalState) {
      tabInitialGlobalState = cloneDeep(tabState.globalState);
    }

    if (tabState.appState) {
      tabInitialAppState = cloneDeep(tabState.appState);
    }

    if (tabState.initialInternalState) {
      tabInitialInternalState = cloneDeep(tabState.initialInternalState);
    }

    if (esqlControls) {
      dispatch(
        updateAttributes({
          tabId,
          attributes: {
            controlGroupState: esqlControls,
          },
        })
      );

      dispatch(
        internalStateSlice.actions.setEsqlVariables({
          tabId,
          esqlVariables: extractEsqlVariables(esqlControls),
        })
      );
    }

    // Get a snapshot of the current URL state before any async work is done
    // to avoid race conditions if the URL changes during tab initialization,
    // e.g. if the user quickly switches tabs
    const urlGlobalState = urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY);
    const urlAppState = {
      ...tabInitialAppState,
      ...(defaultUrlState ??
        cleanupUrlState(urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY), services.uiSettings)),
    };

    const discoverTabLoadTracker = scopedEbtManager$
      .getValue()
      .trackPerformanceEvent('discoverLoadSavedSearch');

    const { persistedDiscoverSession } = getState();
    const persistedTab = persistedDiscoverSession?.tabs.find((tab) => tab.id === tabId);
    const persistedTabSavedSearch =
      persistedDiscoverSession && persistedTab
        ? await fromSavedObjectTabToSavedSearch({
            tab: persistedTab,
            discoverSession: persistedDiscoverSession,
            services,
          })
        : undefined;

    const initialQuery = urlAppState?.query ?? persistedTab?.serializedSearchSource.query;
    const isEsqlMode = isOfAggregateQueryType(initialQuery);

    const initialDataViewIdOrSpec = tabInitialInternalState?.serializedSearchSource?.index;
    const initialAdHocDataViewSpec = isObject(initialDataViewIdOrSpec)
      ? initialDataViewIdOrSpec
      : undefined;

    const persistedTabDataView = persistedTabSavedSearch?.searchSource.getField('index');
    const dataViewId = isDataViewSource(urlAppState?.dataSource)
      ? urlAppState?.dataSource.dataViewId
      : persistedTabDataView?.id;

    const tabHasInitialAdHocDataViewSpec =
      dataViewId && initialAdHocDataViewSpec?.id === dataViewId;
    const peristedTabHasAdHocDataView = Boolean(
      persistedTabDataView && !persistedTabDataView.isPersisted()
    );

    const { initializationState, defaultProfileAdHocDataViewIds } = getState();
    const profileDataViews = runtimeStateManager.adHocDataViews$
      .getValue()
      .filter(({ id }) => id && defaultProfileAdHocDataViewIds.includes(id));

    const profileDataViewsExist = profileDataViews.length > 0;
    const locationStateHasDataViewSpec = Boolean(dataViewSpec);
    const canAccessWithoutPersistedDataView =
      isEsqlMode ||
      tabHasInitialAdHocDataViewSpec ||
      peristedTabHasAdHocDataView ||
      profileDataViewsExist ||
      locationStateHasDataViewSpec;

    if (!initializationState.hasUserDataView && !canAccessWithoutPersistedDataView) {
      return { showNoDataPage: true };
    }

    /**
     * Tab initialization
     */

    let dataView: DataView;

    if (isOfAggregateQueryType(initialQuery)) {
      // Regardless of what was requested, we always use ad hoc data views for ES|QL
      dataView = await getEsqlDataView(
        initialQuery,
        persistedTabDataView ?? currentDataView$.getValue(),
        services
      );
    } else {
      // Load the requested data view if one exists, or a fallback otherwise
      const result = await loadAndResolveDataView({
        dataViewId,
        locationDataViewSpec: dataViewSpec,
        initialAdHocDataViewSpec,
        savedSearch: persistedTabSavedSearch,
        isEsqlMode,
        services,
        internalState: stateContainer.internalState,
        runtimeStateManager,
      });

      dataView = result.dataView;
    }

    dispatch(setDataView({ tabId, dataView }));

    if (!dataView.isPersisted()) {
      dispatch(appendAdHocDataViews(dataView));
    }

    const initialGlobalState: TabStateGlobalState = {
      ...(persistedTabSavedSearch?.timeRestore && dataView.isTimeBased()
        ? pick(persistedTabSavedSearch, 'timeRange', 'refreshInterval')
        : undefined),
      ...tabInitialGlobalState,
    };

    if (urlGlobalState?.time) {
      initialGlobalState.timeRange = urlGlobalState.time;
    }

    if (urlGlobalState?.refreshInterval) {
      initialGlobalState.refreshInterval = urlGlobalState.refreshInterval;
    }

    if (urlGlobalState?.filters) {
      initialGlobalState.filters = urlGlobalState.filters;
    }

    // Get the initial app state based on a combo of the URL and persisted tab saved search,
    // then get an updated copy of the saved search with the applied initial state
    const initialAppState = getInitialAppState({
      initialUrlState: urlAppState,
      hasGlobalState: Object.keys(urlGlobalState || {}).length > 0,
      persistedTab,
      dataView,
      services,
    });

    const savedSearch = updateSavedSearch({
      savedSearch: persistedTabSavedSearch
        ? copySavedSearch(persistedTabSavedSearch)
        : services.savedSearch.getNew(),
      dataView,
      appState: initialAppState,
      globalState: initialGlobalState,
      services,
    });

    /**
     * Sync global services
     */

    // Only update global services if this is still the current tab
    if (getState().tabs.unsafeCurrentId === tabId) {
      // Push the tab's initial search session ID to the URL if one exists,
      // unless it should be overridden by a search session ID already in the URL
      if (
        tabInitialInternalState?.searchSessionId &&
        !searchSessionManager.hasSearchSessionIdInURL()
      ) {
        searchSessionManager.pushSearchSessionIdToURL(tabInitialInternalState.searchSessionId, {
          replace: true,
        });
      }

      // Cleaning up the previous state
      services.filterManager.setAppFilters([]);
      services.data.query.queryString.clearQuery();

      if (initialGlobalState.timeRange && isTimeRangeValid(initialGlobalState.timeRange)) {
        services.timefilter.setTime(initialGlobalState.timeRange);
      }

      if (
        initialGlobalState.refreshInterval &&
        isRefreshIntervalValid(initialGlobalState.refreshInterval)
      ) {
        services.timefilter.setRefreshInterval(initialGlobalState.refreshInterval);
      }

      if (initialGlobalState.filters) {
        services.filterManager.setGlobalFilters(cloneDeep(initialGlobalState.filters));
      }

      if (initialAppState.filters) {
        services.filterManager.setAppFilters(cloneDeep(initialAppState.filters));
      }

      // some filters may not be valid for this context, so update
      // the filter manager with a modified list of valid filters
      const currentFilters = services.filterManager.getFilters();
      const validFilters = getValidFilters(dataView, currentFilters);
      if (!isEqual(currentFilters, validFilters)) {
        services.filterManager.setFilters(validFilters);
      }

      if (initialAppState.query) {
        services.data.query.queryString.setQuery(initialAppState.query);
      }
    }

    /**
     * Update state containers
     */

    if (persistedTabSavedSearch) {
      // Set the persisted tab saved search first, then assign the
      // updated saved search to ensure unsaved changes are detected
      stateContainer.savedSearchState.set(persistedTabSavedSearch);
      stateContainer.savedSearchState.assignNextSavedSearch(savedSearch);
    } else {
      stateContainer.savedSearchState.set(savedSearch);
    }

    // Make sure app state is completely reset
    dispatch(internalStateSlice.actions.resetAppState({ tabId, appState: initialAppState }));

    // Set runtime state
    stateContainer$.next(stateContainer);
    customizationService$.next(customizationService);

    // Begin syncing the state and trigger the initial fetch
    // if this is still the current tab, otherwise mark the
    // tab to fetch when selected
    if (getState().tabs.unsafeCurrentId === tabId) {
      dispatch(initializeAndSync({ tabId }));
      dispatch(fetchData({ tabId, initial: true }));
    } else {
      dispatch(
        internalStateSlice.actions.setForceFetchOnSelect({ tabId, forceFetchOnSelect: true })
      );
    }

    discoverTabLoadTracker.reportEvent();

    return { showNoDataPage: false };
  }
);
