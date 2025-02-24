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
import { lazy, useCallback, useMemo, useState } from 'react';
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
import { isEsqlSource } from '../../../common/data_sources';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  InternalStateProvider,
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  useInternalStateDispatch,
} from './state_management/redux';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { RootProfileState, useRootProfile } from '../../context_awareness';
import { useDefaultAdHocDataViews2 } from '../../context_awareness/hooks/use_default_ad_hoc_data_views';
import { DiscoverError } from '../../components/common/error_alert';
import { MainHistoryLocationState } from '../../../common';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { APP_STATE_URL_KEY, AppStateUrl } from './state_management/discover_app_state_container';
import { cleanupUrlState } from './state_management/utils/cleanup_url_state';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { useUrl } from './hooks/use_url';

export interface MainRoute2Props {
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  customizationContext: DiscoverCustomizationContext;
}

interface MainInitializationState {
  hasESData: boolean;
  hasUserDataView: boolean;
}

type InitializeMain = (
  overrides?: MainInitializationState & {
    dataView?: DataView;
  }
) => Promise<MainInitializationState>;

type NarrowAsyncState<TState extends AsyncState<unknown>> = Exclude<
  TState,
  { error?: undefined; value?: undefined }
>;

export const DiscoverMainRoute2 = ({
  customizationCallbacks = [],
  customizationContext,
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
  const initialize = useLatest<InitializeMain>(async (overrides) => {
    const { dataViews } = services;
    const shouldRefreshDataViews = !overrides || Boolean(overrides.dataView);
    const [hasESData, hasUserDataView, defaultDataViewExists, savedDataViews] = await Promise.all([
      overrides?.hasESData ?? dataViews.hasData.hasESData().catch(() => false),
      overrides?.hasUserDataView ?? dataViews.hasData.hasUserDataView().catch(() => false),
      overrides?.hasUserDataView ?? dataViews.defaultDataViewExists().catch(() => false),
      services.dataViews.getIdsWithTitle(shouldRefreshDataViews).catch(() => []),
    ]);

    internalState.dispatch(internalStateActions.setSavedDataViews(savedDataViews));

    if (overrides?.dataView) {
      internalState.dispatch(internalStateActions.setDataView(overrides.dataView));
    }

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

  useMount(() => {
    initializeMain();
  });

  if (rootProfileState.rootProfileLoading || mainInitializationState.loading) {
    return <BrandedLoadingIndicator />;
  }

  if (mainInitializationState.error) {
    return <DiscoverError error={mainInitializationState.error} />;
  }

  if (!mainInitializationState.value.hasESData) {
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
          urlStateStorage={urlStateStorage}
          initializeMain={initializeMain}
        />
      </rootProfileState.AppWrapper>
    </InternalStateProvider>
  );
};

interface DiscoverSessionViewProps {
  rootProfileState: Extract<RootProfileState, { rootProfileLoading: false }>;
  mainInitializationState: MainInitializationState;
  customizationContext: DiscoverCustomizationContext;
  urlStateStorage: IKbnUrlStateStorage;
  initializeMain: InitializeMain;
}

const DiscoverSessionView = ({
  rootProfileState,
  mainInitializationState,
  customizationContext,
  urlStateStorage,
  initializeMain,
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
  const { initializeProfileDataViews } = useDefaultAdHocDataViews2({ rootProfileState });
  const initialize = useLatest(async () => {
    const discoverSessionLoadTracker = ebtManager.trackPerformanceEvent('discoverLoadSavedSearch');
    const urlState = cleanupUrlState(
      urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? {},
      uiSettings
    );
    const isEsqlQuery = isEsqlSource(urlState.dataSource);
    const discoverSession = discoverSessionId
      ? await savedSearch.get(discoverSessionId)
      : undefined;
    const discoverSessionDataView = discoverSession?.searchSource.getField('index');
    const discoverSessionHasAdHocDataView = Boolean(
      discoverSessionDataView && !discoverSessionDataView.isPersisted()
    );
    const profileDataViews = await initializeProfileDataViews();
    const profileDataViewsExist = profileDataViews.length > 0;
    const locationStateHasDataViewSpec = Boolean(historyLocationState?.dataViewSpec);
    const canAccessWithoutPersistedDataView =
      isEsqlQuery ||
      discoverSessionHasAdHocDataView ||
      profileDataViewsExist ||
      locationStateHasDataViewSpec;

    if (!mainInitializationState.hasUserDataView && !canAccessWithoutPersistedDataView) {
      return { showNoDataPage: true };
    }

    if (customizationContext.displayMode === 'standalone' && discoverSession) {
      if (discoverSession.id) {
        chrome.recentlyAccessed.add(
          getSavedSearchFullPathUrl(discoverSession.id),
          discoverSession.title ??
            i18n.translate('discover.defaultDiscoverSessionTitle', {
              defaultMessage: 'Untitled Discover session',
            }),
          discoverSession.id
        );
      }

      setBreadcrumbs({ services, titleBreadcrumbText: discoverSession.title });
    }

    dispatch(internalStateActions.setDefaultProfileAdHocDataViews(profileDataViews));
    discoverSessionLoadTracker.reportEvent();

    return { showNoDataPage: false };
  });
  const [initializationState, initializeSession] = useAsyncFn(
    () => initialize.current(),
    [initialize],
    {
      loading: true,
    }
  );
  const initializeSessionState = initializationState as NarrowAsyncState<
    typeof initializationState
  >;

  useMount(() => {
    initializeSession();
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

  useUrl({
    history,
    savedSearchId: discoverSessionId,
    onNewUrl: useCallback(() => {
      initializeMain({
        hasESData: true,
        hasUserDataView: true,
      });
    }, [initializeMain]),
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
        onDataViewCreated={(dataView) => {
          initializeMain({
            hasESData: true,
            hasUserDataView: true,
            dataView: dataView as DataView,
          });
        }}
        onESQLNavigationComplete={() => {
          initializeMain({
            hasESData: true,
            hasUserDataView: true,
          });
        }}
      />
    );
  }

  return <p>HELLO I WORK!</p>;
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
