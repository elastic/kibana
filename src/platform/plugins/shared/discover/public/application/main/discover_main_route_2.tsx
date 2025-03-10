/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory, useParams } from 'react-router-dom';
import {
  IKbnUrlStateStorage,
  SavedObjectNotFound,
  createKbnUrlStateStorage,
  redirectWhenMissing,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import { lazy, useEffect, useMemo, useState } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  AnalyticsNoDataPageKibanaDependencies,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
import { withSuspense } from '@kbn/shared-ux-utility';
import useAsyncFn, { AsyncState } from 'react-use/lib/useAsyncFn';
import useMount from 'react-use/lib/useMount';
import { DataView } from '@kbn/data-views-plugin/common';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { cloneDeep, isEqual } from 'lodash';
import { createDataViewDataSource, isDataViewSource } from '../../../common/data_sources';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import {
  CustomizationCallback,
  DiscoverCustomizationContext,
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../customizations';
import {
  InternalStateProvider,
  InternalStateStore,
  RuntimeStateManager,
  RuntimeStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  useInternalStateDispatch,
  useInternalStateSelector,
  useRuntimeState,
} from './state_management/redux';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import {
  RootProfileState,
  useRootProfile,
  useDefaultAdHocDataViews,
} from '../../context_awareness';
import { DiscoverError } from '../../components/common/error_alert';
import { MainHistoryLocationState } from '../../../common';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import {
  APP_STATE_URL_KEY,
  AppStateUrl,
  DiscoverAppState,
  getInitialState,
} from './state_management/discover_app_state_container';
import { cleanupUrlState } from './state_management/utils/cleanup_url_state';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { useUrl } from './hooks/use_url';
import { isRefreshIntervalValid, isTimeRangeValid } from '../../utils/validate_time';
import {
  DiscoverStateContainer,
  getDiscoverStateContainer,
} from './state_management/discover_state';
import { getEsqlDataView } from './state_management/utils/get_esql_data_view';
import { loadAndResolveDataView } from './state_management/utils/resolve_data_view';
import { updateSavedSearch } from './state_management/utils/update_saved_search';
import { DiscoverMainProvider } from './state_management/discover_state_provider';
import { DiscoverMainApp } from './discover_main_app';
import { getValidFilters } from '../../utils/get_valid_filters';
import { copySavedSearch } from './state_management/discover_saved_search_container';

export interface MainRoute2Props {
  customizationContext: DiscoverCustomizationContext;
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
}

interface MainInitializationState {
  hasESData: boolean;
  hasUserDataView: boolean;
}

type InitializeMain = (
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>
) => Promise<MainInitializationState>;

type NarrowAsyncState<TState extends AsyncState<unknown>> = Exclude<
  TState,
  { error?: undefined; value?: undefined }
>;

const defaultCustomizationCallbacks: CustomizationCallback[] = [];

export const DiscoverMainRoute2 = ({
  customizationContext,
  customizationCallbacks = defaultCustomizationCallbacks,
  stateStorageContainer,
}: MainRoute2Props) => {
  const services = useDiscoverServices();
  const rootProfileState = useRootProfile();
  const history = useHistory();
  const [urlStateStorage] = useState(
    () =>
      stateStorageContainer ??
      createKbnUrlStateStorage({
        useHash: services.uiSettings.get('state:storeInSessionStorage'),
        history,
        useHashQuery: customizationContext.displayMode !== 'embedded',
        ...withNotifyOnErrors(services.core.notifications.toasts),
      })
  );
  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [internalState] = useState(() =>
    createInternalStateStore({ services, runtimeStateManager })
  );
  const { initializeProfileDataViews } = useDefaultAdHocDataViews({ internalState });
  const initialize = useLatest<InitializeMain>(async (loadedRootProfileState) => {
    const { dataViews } = services;
    const [hasESData, hasUserDataView, defaultDataViewExists] = await Promise.all([
      dataViews.hasData.hasESData().catch(() => false),
      dataViews.hasData.hasUserDataView().catch(() => false),
      dataViews.defaultDataViewExists().catch(() => false),
      internalState.dispatch(internalStateActions.loadDataViewList()).catch(() => {}),
      initializeProfileDataViews(loadedRootProfileState).catch(() => {}),
    ]);

    return {
      hasESData,
      hasUserDataView: hasUserDataView && defaultDataViewExists,
    };
  });
  const [initializationState, initializeMain] = useAsyncFn<InitializeMain>(
    (...params) => initialize.current(...params),
    [initialize],
    { loading: true }
  );
  const mainInitializationState = initializationState as NarrowAsyncState<
    typeof initializationState
  >;

  useEffect(() => {
    if (!rootProfileState.rootProfileLoading) {
      initializeMain(rootProfileState);
    }
  }, [initializeMain, rootProfileState]);

  if (rootProfileState.rootProfileLoading || mainInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainInitializationState.error) {
    return <DiscoverError error={mainInitializationState.error} />;
  }

  if (!mainInitializationState.value.hasESData && !mainInitializationState.value.hasUserDataView) {
    return (
      <NoDataPage
        {...mainInitializationState.value}
        onDataViewCreated={() => {
          // This is unused if there is no ES data
        }}
      />
    );
  }

  return (
    <InternalStateProvider store={internalState}>
      <rootProfileState.AppWrapper>
        <DiscoverSessionView
          rootProfileState={rootProfileState}
          mainInitializationState={mainInitializationState.value}
          customizationContext={customizationContext}
          customizationCallbacks={customizationCallbacks}
          urlStateStorage={urlStateStorage}
          internalState={internalState}
          runtimeStateManager={runtimeStateManager}
        />
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};

interface DiscoverSessionViewProps {
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>;
  mainInitializationState: MainInitializationState;
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

const DiscoverSessionView = ({
  rootProfileState,
  mainInitializationState,
  customizationContext,
  customizationCallbacks,
  urlStateStorage,
  internalState,
  runtimeStateManager,
}: DiscoverSessionViewProps) => {
  const dispatch = useInternalStateDispatch();
  const services = useDiscoverServices();
  const {
    core,
    chrome,
    ebtManager,
    savedSearch,
    toastNotifications,
    uiSettings,
    history,
    getScopedHistory,
  } = services;
  const { id: discoverSessionId } = useParams<{ id: string }>();
  const [historyLocationState] = useState(
    () => getScopedHistory<MainHistoryLocationState>()?.location.state
  );
  const defaultProfileAdHocDataViewIds = useInternalStateSelector(
    (state) => state.defaultProfileAdHocDataViewIds
  );
  const initialize = useLatest<InitializeSession>(async (defaultUrlState) => {
    internalState.dispatch(internalStateActions.resetOnSavedSearchChange());

    const discoverSessionLoadTracker = ebtManager.trackPerformanceEvent('discoverLoadSavedSearch');
    const urlState = cleanupUrlState(
      urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? defaultUrlState,
      uiSettings
    );
    const persistedDiscoverSession = discoverSessionId
      ? await savedSearch.get(discoverSessionId)
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

    if (!mainInitializationState.hasUserDataView && !canAccessWithoutPersistedDataView) {
      return { showNoDataPage: true };
    }

    if (customizationContext.displayMode === 'standalone' && persistedDiscoverSession) {
      if (persistedDiscoverSession.id) {
        chrome.recentlyAccessed.add(
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
        : savedSearch.getNew(),
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

    stateContainer.appState.set(initialState);
    discoverSessionLoadTracker.reportEvent();

    return { showNoDataPage: false, stateContainer };
  });
  const [initializationState, initializeSession] = useAsyncFn<InitializeSession>(
    (...params) => initialize.current(...params),
    [initialize],
    {
      loading: true,
    }
  );
  const initializeSessionWithDefaultLocationState = useLatest(() => {
    const scopedHistory = getScopedHistory<{ defaultState?: DiscoverAppState }>();
    initializeSession(scopedHistory?.location.state?.defaultState);
  });
  const initializeSessionState = initializationState as NarrowAsyncState<
    typeof initializationState
  >;
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
        {...mainInitializationState}
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
          <rootProfileState.AppWrapper>
            <DiscoverMainApp stateContainer={initializeSessionState.value.stateContainer} />
          </rootProfileState.AppWrapper>
        </RuntimeStateProvider>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
};

const importNoData = () => import('@kbn/shared-ux-page-analytics-no-data');
const AnalyticsNoDataPageKibanaProvider = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPageKibanaProvider }))
);
const AnalyticsNoDataPage = withSuspense(
  lazy(async () => ({ default: (await importNoData()).AnalyticsNoDataPage }))
);

const NoDataPage = ({
  hasESData,
  hasUserDataView,
  onDataViewCreated,
  onESQLNavigationComplete,
}: MainInitializationState & AnalyticsNoDataPageProps) => {
  const services = useDiscoverServices();
  const noDataDependencies = useMemo<AnalyticsNoDataPageKibanaDependencies>(
    () => ({
      ...services,
      coreStart: services.core,
      dataViews: {
        ...services.dataViews,
        hasData: {
          ...services.dataViews.hasData,
          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
    }),
    [hasESData, hasUserDataView, services]
  );

  return (
    <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
      <AnalyticsNoDataPage
        onDataViewCreated={onDataViewCreated}
        onESQLNavigationComplete={onESQLNavigationComplete}
      />
    </AnalyticsNoDataPageKibanaProvider>
  );
};

const RedirectWhenSavedObjectNotFound = ({
  error,
  discoverSessionId,
}: {
  error: SavedObjectNotFound;
  discoverSessionId: string | undefined;
}) => {
  const {
    application: { navigateToApp },
    core,
    history,
    http: { basePath },
    toastNotifications,
    urlTracker,
  } = useDiscoverServices();

  useMount(() => {
    const redirect = redirectWhenMissing({
      history,
      navigateToApp,
      basePath,
      mapping: {
        search: '/',
        'index-pattern': {
          app: 'management',
          path: `kibana/objects/savedSearches/${discoverSessionId}`,
        },
      },
      toastNotifications,
      onBeforeRedirect() {
        urlTracker.setTrackedUrl('/');
      },
      ...core,
    });

    redirect(error);
  });

  return <BrandedLoadingIndicator />;
};

const BrandedLoadingIndicator = () => {
  const { core } = useDiscoverServices();
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  return <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />;
};
