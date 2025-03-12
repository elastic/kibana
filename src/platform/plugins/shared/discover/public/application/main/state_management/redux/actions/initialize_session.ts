/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { cloneDeep, isEqual } from 'lodash';
import type { MainHistoryLocationState } from '../../../../../../common';
import type { MainRouteInitializationState } from '../../../types';
import { internalStateSlice, type InternalStateThunkActionCreator } from '../internal_state';
import {
  APP_STATE_URL_KEY,
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

export interface InitializeSessionParams {
  stateContainer: DiscoverStateContainer;
  mainRouteInitializationState: MainRouteInitializationState;
  discoverSessionId: string | undefined;
  historyLocationState: MainHistoryLocationState | undefined;
  defaultUrlState: DiscoverAppState | undefined;
}

export const initializeSession: InternalStateThunkActionCreator<
  [InitializeSessionParams],
  Promise<{ showNoDataPage: boolean }>
> =
  ({
    stateContainer,
    mainRouteInitializationState,
    discoverSessionId,
    historyLocationState,
    defaultUrlState,
  }) =>
  async (
    dispatch,
    getState,
    { services, customizationContext, runtimeStateManager, urlStateStorage }
  ) => {
    dispatch(internalStateSlice.actions.resetOnSavedSearchChange());

    const discoverSessionLoadTracker =
      services.ebtManager.trackPerformanceEvent('discoverLoadSavedSearch');
    const urlState = cleanupUrlState(
      urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? defaultUrlState,
      services.uiSettings
    );
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
    const { defaultProfileAdHocDataViewIds } = getState();
    const profileDataViews = runtimeStateManager.adHocDataViews$
      .getValue()
      .filter(({ id }) => id && defaultProfileAdHocDataViewIds.includes(id));
    const profileDataViewsExist = profileDataViews.length > 0;
    const locationStateHasDataViewSpec = Boolean(historyLocationState?.dataViewSpec);
    const canAccessWithoutPersistedDataView =
      isEsqlMode ||
      discoverSessionHasAdHocDataView ||
      profileDataViewsExist ||
      locationStateHasDataViewSpec;

    if (!mainRouteInitializationState.hasUserDataView && !canAccessWithoutPersistedDataView) {
      return { showNoDataPage: true };
    }

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
      dataView = await getEsqlDataView(
        initialQuery,
        runtimeStateManager.currentDataView$.getValue(),
        services
      );
    } else {
      const result = await loadAndResolveDataView({
        dataViewId: isDataViewSource(urlState?.dataSource)
          ? urlState?.dataSource.dataViewId
          : discoverSessionDataView?.id,
        dataViewSpec: historyLocationState?.dataViewSpec,
        savedSearch: persistedDiscoverSession,
        isEsqlMode,
        services,
        internalState: stateContainer.internalState,
        runtimeStateManager,
      });

      dataView = result.dataView;
    }

    dispatch(setDataView(dataView));

    if (!dataView.isPersisted()) {
      dispatch(appendAdHocDataViews(dataView));
    }

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

    if (discoverSession.timeRestore && dataView.isTimeBased()) {
      const { timeRange, refreshInterval } = discoverSession;

      if (timeRange && isTimeRangeValid(timeRange)) {
        services.timefilter.setTime(timeRange);
      }

      if (refreshInterval && isRefreshIntervalValid(refreshInterval)) {
        services.timefilter.setRefreshInterval(refreshInterval);
      }
    }

    // Cleaning up the previous state
    services.filterManager.setAppFilters([]);
    services.data.query.queryString.clearQuery();

    // Sync global filters (coming from URL) to filter manager.
    // It needs to be done manually here as `syncGlobalQueryStateWithUrl` is being called after this `loadSavedSearch` function.
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

    if (!urlState && shouldUpdateWithGlobalFilters) {
      discoverSession.searchSource.setField(
        'filter',
        cloneDeep(services.filterManager.getFilters())
      );
    }

    if (persistedDiscoverSession) {
      stateContainer.savedSearchState.set(persistedDiscoverSession);
      stateContainer.savedSearchState.assignNextSavedSearch(discoverSession);
    } else {
      stateContainer.savedSearchState.set(discoverSession);
    }

    stateContainer.appState.resetToState(initialState);
    stateContainer.appState.resetInitialState();
    discoverSessionLoadTracker.reportEvent();

    return { showNoDataPage: false };
  };
