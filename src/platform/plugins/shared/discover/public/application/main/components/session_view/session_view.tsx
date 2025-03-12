/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { useParams } from 'react-router-dom';
import useLatest from 'react-use/lib/useLatest';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import { cloneDeep, isEqual } from 'lodash';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { getValidFilters } from '../../../../utils/get_valid_filters';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../../../utils/validate_time';
import { useUrl } from '../../hooks/use_url';
import { useAlertResultsToast } from '../../hooks/use_alert_results_toast';
import { createDataViewDataSource, isDataViewSource } from '../../../../../common/data_sources';
import { copySavedSearch } from '../../state_management/discover_saved_search_container';
import { loadAndResolveDataView } from '../../state_management/utils/resolve_data_view';
import { setBreadcrumbs } from '../../../../utils/breadcrumbs';
import type { MainHistoryLocationState } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getEsqlDataView } from '../../state_management/utils/get_esql_data_view';
import {
  APP_STATE_URL_KEY,
  getInitialState,
} from '../../state_management/discover_app_state_container';
import type {
  AppStateUrl,
  DiscoverAppState,
} from '../../state_management/discover_app_state_container';
import { getDiscoverStateContainer } from '../../state_management/discover_state';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  RuntimeStateProvider,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  useRuntimeState,
} from '../../state_management/redux';
import type {
  CustomizationCallback,
  DiscoverCustomizationContext,
} from '../../../../customizations';
import type { InternalStateStore, RuntimeStateManager } from '../../state_management/redux';
import {
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../../../customizations';
import { cleanupUrlState } from '../../state_management/utils/cleanup_url_state';
import { DiscoverError } from '../../../../components/common/error_alert';
import { NoDataPage } from './no_data_page';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import { updateSavedSearch } from '../../state_management/utils/update_saved_search';
import { BrandedLoadingIndicator } from './branded_loading_indicator';
import { RedirectWhenSavedObjectNotFound } from './redirect_not_found';
import { DiscoverMainApp } from './main_app';
import type { MainRouteInitializationState } from '../../types';
import { useAsyncFunction } from '../../hooks/use_async_function';
import type { DiscoverServices } from '../../../../build_services';

interface DiscoverSessionViewProps {
  mainRouteInitializationState: MainRouteInitializationState;
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks: CustomizationCallback[];
  urlStateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
}

type SessionInitializationState =
  | {
      showNoDataPage: true;
      stateContainer: undefined;
    }
  | {
      showNoDataPage: false;
      stateContainer: DiscoverStateContainer;
    };

type InitializeSession = (
  defaultUrlState?: DiscoverAppState
) => Promise<SessionInitializationState>;

export const DiscoverSessionView = ({
  mainRouteInitializationState,
  customizationCallbacks,
  runtimeStateManager,
  ...restProps
}: DiscoverSessionViewProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();
  const { core, toastNotifications, history, getScopedHistory } = services;
  const { id: discoverSessionId } = useParams<{ id?: string }>();
  const [historyLocationState] = useState(
    () => getScopedHistory<MainHistoryLocationState>()?.location.state
  );
  const defaultProfileAdHocDataViewIds = useInternalStateSelector(
    (state) => state.defaultProfileAdHocDataViewIds
  );
  const [initializeSessionState, initializeSession] = useAsyncFunction<InitializeSession>(
    getInitializeSession({
      ...restProps,
      mainRouteInitializationState,
      runtimeStateManager,
      discoverSessionId,
      historyLocationState,
      defaultProfileAdHocDataViewIds,
      services,
    })
  );
  const initializeSessionWithDefaultLocationState = useLatest(() => {
    const scopedHistory = getScopedHistory<{ defaultState?: DiscoverAppState }>();
    initializeSession(scopedHistory?.location.state?.defaultState);
  });
  const customizationService = useDiscoverCustomizationService({
    customizationCallbacks,
    stateContainer: initializeSessionState.value?.stateContainer,
  });
  const currentDataView = useRuntimeState(runtimeStateManager.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);

  useEffect(() => {
    initializeSessionWithDefaultLocationState.current();
  }, [discoverSessionId, initializeSessionWithDefaultLocationState]);

  useUrl({
    history,
    savedSearchId: discoverSessionId,
    onNewUrl: () => {
      initializeSessionWithDefaultLocationState.current();
    },
  });

  useAlertResultsToast({
    isAlertResults: historyLocationState?.isAlertResults,
    toastNotifications,
  });

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: discoverSessionId || 'new',
  });

  if (initializeSessionState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (initializeSessionState.error) {
    if (initializeSessionState.error instanceof SavedObjectNotFound) {
      return (
        <RedirectWhenSavedObjectNotFound
          error={initializeSessionState.error}
          discoverSessionId={discoverSessionId}
        />
      );
    }

    return <DiscoverError error={initializeSessionState.error} />;
  }

  if (initializeSessionState.value.showNoDataPage) {
    return (
      <NoDataPage
        {...mainRouteInitializationState}
        onDataViewCreated={async (dataViewUnknown) => {
          await dispatch(internalStateActions.loadDataViewList());
          const dataView = dataViewUnknown as DataView;
          initializeSession({
            dataSource: dataView.id
              ? createDataViewDataSource({ dataViewId: dataView.id })
              : undefined,
          });
        }}
        onESQLNavigationComplete={() => {
          initializeSession();
        }}
      />
    );
  }

  if (!customizationService || !currentDataView) {
    return <BrandedLoadingIndicator />;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={initializeSessionState.value.stateContainer}>
        <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
          <DiscoverMainApp stateContainer={initializeSessionState.value.stateContainer} />
        </RuntimeStateProvider>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
};

type GetInitializeSessionProps = Pick<
  DiscoverSessionViewProps,
  | 'mainRouteInitializationState'
  | 'customizationContext'
  | 'urlStateStorage'
  | 'internalState'
  | 'runtimeStateManager'
> & {
  discoverSessionId: string | undefined;
  historyLocationState: MainHistoryLocationState | undefined;
  defaultProfileAdHocDataViewIds: string[];
  services: DiscoverServices;
};

const getInitializeSession =
  ({
    mainRouteInitializationState,
    customizationContext,
    urlStateStorage,
    internalState,
    runtimeStateManager,
    discoverSessionId,
    historyLocationState,
    defaultProfileAdHocDataViewIds,
    services,
  }: GetInitializeSessionProps): InitializeSession =>
  async (defaultUrlState) => {
    internalState.dispatch(internalStateActions.resetOnSavedSearchChange());

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
        internalState,
        runtimeStateManager,
      });

      dataView = result.dataView;
    }

    internalState.dispatch(internalStateActions.setDataView(dataView));

    if (!dataView.isPersisted()) {
      internalState.dispatch(internalStateActions.appendAdHocDataViews(dataView));
    }

    const stateContainer = getDiscoverStateContainer({
      services,
      customizationContext,
      stateStorageContainer: urlStateStorage,
      internalState,
      runtimeStateManager,
    });
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

    return { showNoDataPage: false, stateContainer };
  };
