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
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { cloneDeep, isEqual } from 'lodash';
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
import { setBreadcrumbs } from '../../../../../utils/breadcrumbs';
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
import { disconnectTab, clearAllTabs } from './tabs';
import { selectTab } from '../selectors';

export interface InitializeSessionParams {
  stateContainer: DiscoverStateContainer;
  customizationService: ConnectedCustomizationService;
  discoverSessionId: string | undefined;
  dataViewSpec: DataViewSpec | undefined;
  defaultUrlState: DiscoverAppState | undefined;
  shouldClearAllTabs: boolean | undefined;
}

export const initializeSession: InternalStateThunkActionCreator<
  [TabActionPayload<{ initializeSessionParams: InitializeSessionParams }>],
  Promise<{ showNoDataPage: boolean }>
> =
  ({
    tabId,
    initializeSessionParams: {
      stateContainer,
      customizationService,
      discoverSessionId,
      dataViewSpec,
      defaultUrlState,
      shouldClearAllTabs,
    },
  }) =>
  async (
    dispatch,
    getState,
    { services, customizationContext, runtimeStateManager, urlStateStorage, tabsStorageManager }
  ) => {
    dispatch(disconnectTab({ tabId }));
    dispatch(internalStateSlice.actions.resetOnSavedSearchChange({ tabId }));

    if (TABS_ENABLED && shouldClearAllTabs) {
      dispatch(clearAllTabs());
    }

    const {
      currentDataView$,
      stateContainer$,
      customizationService$,
      scopedProfilesManager$,
      scopedEbtManager$,
    } = selectTabRuntimeState(runtimeStateManager, tabId);
    const tabState = selectTab(getState(), tabId);

    let urlState = cleanupUrlState(
      defaultUrlState ?? urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY),
      services.uiSettings
    );

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

    if (TABS_ENABLED && !wasTabInitialized) {
      const tabInitialGlobalState = tabState.initialGlobalState;

      if (tabInitialGlobalState?.filters) {
        services.filterManager.setGlobalFilters(cloneDeep(tabInitialGlobalState.filters));
      }

      if (tabInitialGlobalState?.timeRange) {
        services.timefilter.setTime(tabInitialGlobalState.timeRange);
      }
      if (tabInitialGlobalState?.refreshInterval) {
        services.timefilter.setRefreshInterval(tabInitialGlobalState.refreshInterval);
      }

      const tabInitialAppState = tabState.initialAppState;

      if (tabInitialAppState) {
        urlState = cloneDeep(tabInitialAppState);
      }
    }

    const discoverSessionLoadTracker = scopedEbtManager$
      .getValue()
      .trackPerformanceEvent('discoverLoadSavedSearch');

    const persistedDiscoverSession = discoverSessionId
      ? await services.savedSearch.get(discoverSessionId)
      : undefined;
    const initialQuery =
      urlState?.query ?? persistedDiscoverSession?.searchSource.getField('query');
    const isEsqlMode = isOfAggregateQueryType(initialQuery);
    const discoverSessionDataView = persistedDiscoverSession?.searchSource.getField('index');
    const discoverSessionHasAdHocDataView = Boolean(
      discoverSessionDataView && !discoverSessionDataView.isPersisted()
    );
    const { initializationState, defaultProfileAdHocDataViewIds } = getState();
    const profileDataViews = runtimeStateManager.adHocDataViews$
      .getValue()
      .filter(({ id }) => id && defaultProfileAdHocDataViewIds.includes(id));
    const profileDataViewsExist = profileDataViews.length > 0;
    const locationStateHasDataViewSpec = Boolean(dataViewSpec);
    const canAccessWithoutPersistedDataView =
      isEsqlMode ||
      discoverSessionHasAdHocDataView ||
      profileDataViewsExist ||
      locationStateHasDataViewSpec;

    if (!initializationState.hasUserDataView && !canAccessWithoutPersistedDataView) {
      return { showNoDataPage: true };
    }

    /**
     * Session initialization
     */

    // TODO: Needs to happen when switching tabs too?
    if (customizationContext.displayMode === 'standalone' && persistedDiscoverSession) {
      if (persistedDiscoverSession.id) {
        services.chrome.recentlyAccessed.add(
          getSavedSearchFullPathUrl(persistedDiscoverSession.id),
          persistedDiscoverSession.title ??
            i18n.translate('discover.defaultDiscoverSessionTitle', {
              defaultMessage: 'Untitled Discover session',
            }),
          persistedDiscoverSession.id
        );
      }

      setBreadcrumbs({ services, titleBreadcrumbText: persistedDiscoverSession.title });
    }

    let dataView: DataView;

    if (isOfAggregateQueryType(initialQuery)) {
      // Regardless of what was requested, we always use ad hoc data views for ES|QL
      dataView = await getEsqlDataView(
        initialQuery,
        discoverSessionDataView ?? currentDataView$.getValue(),
        services
      );
    } else {
      // Load the requested data view if one exists, or a fallback otherwise
      const result = await loadAndResolveDataView({
        dataViewId: isDataViewSource(urlState?.dataSource)
          ? urlState?.dataSource.dataViewId
          : discoverSessionDataView?.id,
        dataViewSpec,
        savedSearch: persistedDiscoverSession,
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
    // it updates the Discover session with timefilter values
    if (persistedDiscoverSession?.timeRestore && dataView.isTimeBased()) {
      const { timeRange, refreshInterval } = persistedDiscoverSession;

      if (timeRange && isTimeRangeValid(timeRange)) {
        services.timefilter.setTime(timeRange);
      }

      if (refreshInterval && isRefreshIntervalValid(refreshInterval)) {
        services.timefilter.setRefreshInterval(refreshInterval);
      }
    }

    // Get the initial state based on a combo of the URL and persisted session,
    // then get an updated copy of the session with the applied initial state
    const initialState = getInitialState({
      initialUrlState: urlState,
      savedSearch: persistedDiscoverSession,
      overrideDataView: dataView,
      services,
    });
    const discoverSession = updateSavedSearch({
      savedSearch: persistedDiscoverSession
        ? copySavedSearch(persistedDiscoverSession)
        : services.savedSearch.getNew(),
      dataView,
      state: initialState,
      globalStateContainer: stateContainer.globalState,
      services,
    });

    /**
     * Sync global services
     */

    // Cleaning up the previous state
    services.filterManager.setAppFilters([]);
    services.data.query.queryString.clearQuery();

    // Sync global filters (coming from URL) to filter manager.
    // It needs to be done manually here as `syncGlobalQueryStateWithUrl` is called later.
    const globalFilters = stateContainer.globalState?.get()?.filters;
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

    // Make sure global filters make it to the Discover session
    if (!urlState && shouldUpdateWithGlobalFilters) {
      discoverSession.searchSource.setField(
        'filter',
        cloneDeep(services.filterManager.getFilters())
      );
    }

    /**
     * Update state containers
     */

    if (persistedDiscoverSession) {
      // Set the persisted session first, then assign the
      // updated session to ensure unsaved changes are detected
      stateContainer.savedSearchState.set(persistedDiscoverSession);
      stateContainer.savedSearchState.assignNextSavedSearch(discoverSession);
    } else {
      stateContainer.savedSearchState.set(discoverSession);
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
    discoverSessionLoadTracker.reportEvent();

    return { showNoDataPage: false };
  };
