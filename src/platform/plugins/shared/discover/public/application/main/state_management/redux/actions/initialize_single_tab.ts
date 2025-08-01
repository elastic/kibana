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
import { cloneDeep, isEqual, isObject } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import {
  getInitialState,
  type AppStateUrl,
  type DiscoverAppState,
} from '../../discover_app_state_container';
import type { DiscoverStateContainer } from '../../discover_state';
import { appendAdHocDataViews, setDataView } from './data_views';
import { cleanupUrlState } from '../../utils/cleanup_url_state';
import { getEsqlDataView } from '../../utils/get_esql_data_view';
import { loadAndResolveDataView } from '../../utils/resolve_data_view';
import { isDataViewSource } from '../../../../../../common/data_sources';
import { copySavedSearch } from '../../discover_saved_search_container';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../../../../utils/validate_time';
import { getValidFilters } from '../../../../../utils/get_valid_filters';
import { updateSavedSearch } from '../../utils/update_saved_search';
import { APP_STATE_URL_KEY } from '../../../../../../common';
import { TABS_ENABLED } from '../../../../../constants';
import { selectTabRuntimeState } from '../runtime_state';
import type { ConnectedCustomizationService } from '../../../../../customizations';
import { disconnectTab } from './tabs';
import { selectTab } from '../selectors';
import type { TabState } from '../types';
import { GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { fromSavedObjectTabToSavedSearch } from '../tab_mapping_utils';

export interface InitializeSingleTabsParams {
  stateContainer: DiscoverStateContainer;
  customizationService: ConnectedCustomizationService;
  dataViewSpec: DataViewSpec | undefined;
  defaultUrlState: DiscoverAppState | undefined;
}

export const initializeSingleTab: InternalStateThunkActionCreator<
  [TabActionPayload<{ initializeSingleTabParams: InitializeSingleTabsParams }>],
  Promise<{ showNoDataPage: boolean }>
> =
  ({
    tabId,
    initializeSingleTabParams: {
      stateContainer,
      customizationService,
      dataViewSpec,
      defaultUrlState,
    },
  }) =>
  async (dispatch, getState, { services, runtimeStateManager, urlStateStorage }) => {
    dispatch(disconnectTab({ tabId }));
    dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId }));

    const {
      currentDataView$,
      stateContainer$,
      customizationService$,
      scopedProfilesManager$,
      scopedEbtManager$,
    } = selectTabRuntimeState(runtimeStateManager, tabId);

    /**
     * New tab initialization with the restored data if available
     */

    const wasTabInitialized = Boolean(stateContainer$.getValue());

    if (wasTabInitialized) {
      // Clear existing runtime state on re-initialization
      // to ensure no stale state is used during loading
      currentDataView$.next(undefined);
      stateContainer$.next(undefined);
      customizationService$.next(undefined);
      scopedEbtManager$.next(services.ebtManager.createScopedEBTManager());
      scopedProfilesManager$.next(
        services.profilesManager.createScopedProfilesManager({
          scopedEbtManager: scopedEbtManager$.getValue(),
        })
      );
    }

    let tabInitialAppState: DiscoverAppState | undefined;
    let tabInitialInternalState: TabState['initialInternalState'] | undefined;

    if (TABS_ENABLED && !wasTabInitialized) {
      const tabState = selectTab(getState(), tabId);
      const tabInitialGlobalState = tabState.globalState;

      if (tabInitialGlobalState?.filters) {
        services.filterManager.setGlobalFilters(cloneDeep(tabInitialGlobalState.filters));
      }

      if (tabInitialGlobalState?.timeRange) {
        services.timefilter.setTime(tabInitialGlobalState.timeRange);
      }
      if (tabInitialGlobalState?.refreshInterval) {
        services.timefilter.setRefreshInterval(tabInitialGlobalState.refreshInterval);
      }

      if (tabState.initialAppState) {
        tabInitialAppState = cloneDeep(tabState.initialAppState);
      }

      if (tabState.initialInternalState) {
        tabInitialInternalState = cloneDeep(tabState.initialInternalState);
      }
    }

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

    const urlState = cleanupUrlState(
      {
        ...tabInitialAppState,
        ...(defaultUrlState ?? urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY)),
      },
      services.uiSettings
    );

    const initialQuery = urlState?.query ?? persistedTabSavedSearch?.searchSource.getField('query');
    const isEsqlMode = isOfAggregateQueryType(initialQuery);

    const initialDataViewIdOrSpec = tabInitialInternalState?.serializedSearchSource?.index;
    const initialAdHocDataViewSpec = isObject(initialDataViewIdOrSpec)
      ? initialDataViewIdOrSpec
      : undefined;

    const persistedTabDataView = persistedTabSavedSearch?.searchSource.getField('index');
    const dataViewId = isDataViewSource(urlState?.dataSource)
      ? urlState?.dataSource.dataViewId
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

    // This must be executed before updateSavedSearch since
    // it updates the tab saved search with timefilter values
    if (persistedTabSavedSearch?.timeRestore && dataView.isTimeBased()) {
      const { timeRange, refreshInterval } = persistedTabSavedSearch;

      if (timeRange && isTimeRangeValid(timeRange)) {
        services.timefilter.setTime(timeRange);
      }

      if (refreshInterval && isRefreshIntervalValid(refreshInterval)) {
        services.timefilter.setRefreshInterval(refreshInterval);
      }
    }

    // Get the initial state based on a combo of the URL and persisted tab saved search,
    // then get an updated copy of the saved search with the applied initial state
    const initialState = getInitialState({
      initialUrlState: urlState,
      savedSearch: persistedTabSavedSearch,
      overrideDataView: dataView,
      services,
    });
    const globalState = urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY);
    const savedSearch = updateSavedSearch({
      savedSearch: persistedTabSavedSearch
        ? copySavedSearch(persistedTabSavedSearch)
        : services.savedSearch.getNew(),
      dataView,
      appState: initialState,
      globalState: {
        filters: globalState?.filters,
        timeRange: globalState?.time,
        refreshInterval: globalState?.refreshInterval,
      },
      services,
    });

    /**
     * Sync global services
     */

    // Cleaning up the previous state
    services.filterManager.setAppFilters([]);
    services.data.query.queryString.clearQuery();

    // Sync global filters (coming from URL) to filter manager.
    // It needs to be done manually here as `syncState` is called later.
    const globalFilters = globalState?.filters;
    const shouldUpdateWithGlobalFilters =
      globalFilters?.length && !services.filterManager.getGlobalFilters()?.length;
    if (shouldUpdateWithGlobalFilters) {
      services.filterManager.setGlobalFilters(globalFilters);
    }

    // set data service filters
    if (initialState.filters?.length) {
      // Saved search SO persists all filters as app filters
      services.data.query.filterManager.setAppFilters(cloneDeep(initialState.filters));
    }

    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = services.filterManager.getFilters();
    const validFilters = getValidFilters(dataView, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      services.filterManager.setFilters(validFilters);
    }

    // set data service query
    if (initialState.query) {
      services.data.query.queryString.setQuery(initialState.query);
    }

    // Make sure global filters make it to the tab saved search
    if (!urlState && shouldUpdateWithGlobalFilters) {
      savedSearch.searchSource.setField('filter', cloneDeep(services.filterManager.getFilters()));
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

    // Make sure app state container is completely reset
    stateContainer.appState.resetToState(initialState);
    stateContainer.appState.resetInitialState();

    // Set runtime state
    stateContainer$.next(stateContainer);
    customizationService$.next(customizationService);

    // Begin syncing the state and trigger the initial fetch
    stateContainer.actions.initializeAndSync();
    stateContainer.actions.fetchData(true);
    discoverTabLoadTracker.reportEvent();

    return { showNoDataPage: false };
  };
