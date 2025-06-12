/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect, useState, memo, useCallback, useMemo, lazy } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  type IKbnUrlStateStorage,
  redirectWhenMissing,
  SavedObjectNotFound,
} from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { withSuspense } from '@kbn/shared-ux-utility';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type {
  AnalyticsNoDataPageKibanaDependencies,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUrl } from './hooks/use_url';
import { useDiscoverStateContainer } from './hooks/use_discover_state_container';
import type { MainHistoryLocationState } from '../../../common';
import { DiscoverMainApp } from './discover_main_app';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { DiscoverMainProvider } from './state_management/discover_state_provider';
import type { CustomizationCallback, DiscoverCustomizationContext } from '../../customizations';
import {
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../customizations';
import type { DiscoverStateContainer, LoadParams } from './state_management/discover_state';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import { useDefaultAdHocDataViews, useRootProfile } from '../../context_awareness';
import type { RuntimeStateManager } from './state_management/redux';
import {
  RuntimeStateProvider,
  createRuntimeStateManager,
  useRuntimeState,
} from './state_management/redux';
import { DiscoverTopNavInline } from './components/top_nav/discover_topnav_inline';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

export interface MainRouteProps {
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  customizationContext: DiscoverCustomizationContext;
}

export function DiscoverMainRoute({
  customizationCallbacks = [],
  customizationContext,
  stateStorageContainer,
}: MainRouteProps) {
  const history = useHistory();
  const services = useDiscoverServices();
  const {
    core,
    chrome,
    data,
    toastNotifications,
    http: { basePath },
    dataViewEditor,
    share,
    getScopedHistory,
  } = services;
  const { id: savedSearchId } = useParams<DiscoverLandingParams>();
  const [runtimeStateManager] = useState(() => createRuntimeStateManager());
  const [stateContainer, { reset: resetStateContainer }] = useDiscoverStateContainer({
    history,
    services,
    customizationContext,
    stateStorageContainer,
    runtimeStateManager,
  });
  const customizationService = useDiscoverCustomizationService({
    customizationCallbacks,
    stateContainer,
  });
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [noDataState, setNoDataState] = useState({
    hasESData: false,
    hasUserDataView: false,
    showNoDataPage: false,
  });
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  /**
   * Get location state of scoped history only on initial load
   */
  const historyLocationState = useMemo(
    () => getScopedHistory<MainHistoryLocationState>()?.location.state,
    [getScopedHistory]
  );

  useAlertResultsToast({
    isAlertResults: historyLocationState?.isAlertResults,
    toastNotifications,
  });

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: savedSearchId || 'new',
  });

  /**
   * Helper function to determine when to skip the no data page
   */
  const skipNoDataPage = useCallback(
    async (nextDataView?: DataView) => {
      try {
        const { dataSource } = stateContainer.appState.getState();
        const isEsqlQuery = isDataSourceType(dataSource, DataSourceType.Esql);

        if (savedSearchId || isEsqlQuery || nextDataView) {
          // Although ES|QL doesn't need a data view, we still need to load the data view list to
          // ensure the data view is available for the user to switch to classic mode
          await stateContainer.actions.loadDataViewList();
          return true;
        }

        const [hasUserDataViewValue, hasESDataValue, defaultDataViewExists] = await Promise.all([
          data.dataViews.hasData.hasUserDataView().catch(() => false),
          data.dataViews.hasData.hasESData().catch(() => false),
          data.dataViews.defaultDataViewExists().catch(() => false),
          stateContainer.actions.loadDataViewList(),
        ]);

        const persistedDataViewsExist = hasUserDataViewValue && defaultDataViewExists;
        const adHocDataViewsExist = runtimeStateManager.adHocDataViews$.getValue().length > 0;
        const locationStateHasDataViewSpec = Boolean(historyLocationState?.dataViewSpec);
        const canAccessWithAdHocDataViews =
          hasESDataValue && (adHocDataViewsExist || locationStateHasDataViewSpec);

        if (persistedDataViewsExist || canAccessWithAdHocDataViews) {
          return true;
        }

        setNoDataState({
          showNoDataPage: true,
          hasESData: hasESDataValue,
          hasUserDataView: hasUserDataViewValue,
        });

        return false;
      } catch (e) {
        setError(e);
        return false;
      }
    },
    [
      data.dataViews,
      historyLocationState?.dataViewSpec,
      runtimeStateManager,
      savedSearchId,
      stateContainer,
    ]
  );

  const loadSavedSearch = useCallback(
    async ({
      nextDataView,
      initialAppState,
    }: { nextDataView?: DataView; initialAppState?: LoadParams['initialAppState'] } = {}) => {
      const loadSavedSearchStartTime = window.performance.now();
      setLoading(true);
      const skipNoData = await skipNoDataPage(nextDataView);
      if (!skipNoData) {
        setLoading(false);
        return;
      }
      try {
        const currentSavedSearch = await stateContainer.actions.loadSavedSearch({
          savedSearchId,
          dataView: nextDataView,
          dataViewSpec: historyLocationState?.dataViewSpec,
          initialAppState,
        });
        if (customizationContext.displayMode === 'standalone') {
          if (currentSavedSearch?.id) {
            chrome.recentlyAccessed.add(
              getSavedSearchFullPathUrl(currentSavedSearch.id),
              currentSavedSearch.title ?? '',
              currentSavedSearch.id
            );
          }

          setBreadcrumbs({ services, titleBreadcrumbText: currentSavedSearch?.title ?? undefined });
        }
        setLoading(false);
        if (services.analytics) {
          const loadSavedSearchDuration = window.performance.now() - loadSavedSearchStartTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverLoadSavedSearch',
            duration: loadSavedSearchDuration,
          });
        }
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          redirectWhenMissing({
            history,
            navigateToApp: core.application.navigateToApp,
            basePath,
            mapping: {
              search: '/',
              'index-pattern': {
                app: 'management',
                path: `kibana/objects/savedSearches/${savedSearchId}`,
              },
            },
            toastNotifications,
            onBeforeRedirect() {
              services.urlTracker.setTrackedUrl('/');
            },
            ...core,
          })(e);
        } else {
          setError(e);
        }
      }
    },
    [
      skipNoDataPage,
      stateContainer,
      savedSearchId,
      historyLocationState?.dataViewSpec,
      customizationContext.displayMode,
      services,
      chrome.recentlyAccessed,
      history,
      core,
      basePath,
      toastNotifications,
    ]
  );

  const rootProfileState = useRootProfile();
  const { initializeProfileDataViews } = useDefaultAdHocDataViews({
    stateContainer,
    rootProfileState,
  });

  useEffect(() => {
    if (!customizationService || rootProfileState.rootProfileLoading) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setNoDataState({
        hasESData: false,
        hasUserDataView: false,
        showNoDataPage: false,
      });
      setError(undefined);

      await initializeProfileDataViews();

      if (savedSearchId) {
        await loadSavedSearch();
      } else {
        // restore the previously selected data view for a new state (when a saved search was open)
        await loadSavedSearch(getLoadParamsForNewSearch({ stateContainer, runtimeStateManager }));
      }
    };

    load();
  }, [
    customizationService,
    initializeProfileDataViews,
    loadSavedSearch,
    rootProfileState.rootProfileLoading,
    runtimeStateManager,
    savedSearchId,
    stateContainer,
  ]);

  // secondary fetch: in case URL is set to `/`, used to reset to 'new' state, keeping the current data view
  useUrl({
    history,
    savedSearchId,
    onNewUrl: useCallback(() => {
      // restore the previously selected data view for a new state
      loadSavedSearch(getLoadParamsForNewSearch({ stateContainer, runtimeStateManager }));
    }, [loadSavedSearch, runtimeStateManager, stateContainer]),
  });

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      if (nextDataView) {
        setLoading(true);
        setNoDataState((state) => ({ ...state, showNoDataPage: false }));
        setError(undefined);
        await loadSavedSearch({ nextDataView: nextDataView as DataView });
      }
    },
    [loadSavedSearch]
  );

  const onESQLNavigationComplete = useCallback(async () => {
    resetStateContainer();
  }, [resetStateContainer]);

  const noDataDependencies = useMemo<AnalyticsNoDataPageKibanaDependencies>(
    () => ({
      coreStart: core,
      dataViews: {
        ...data.dataViews,
        hasData: {
          ...data.dataViews.hasData,

          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(noDataState.hasESData),
          hasUserDataView: () => Promise.resolve(noDataState.hasUserDataView),
        },
      },
      share,
      dataViewEditor,
      noDataPage: services.noDataPage,
    }),
    [core, data.dataViews, dataViewEditor, noDataState, services.noDataPage, share]
  );

  const currentDataView = useRuntimeState(runtimeStateManager.currentDataView$);
  const adHocDataViews = useRuntimeState(runtimeStateManager.adHocDataViews$);

  if (error) {
    return <DiscoverError error={error} />;
  }

  const loadingIndicator = <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />;

  if (!customizationService || rootProfileState.rootProfileLoading) {
    return loadingIndicator;
  }

  let mainContent: ReactNode;

  if (!loading && noDataState.showNoDataPage) {
    mainContent = (
      <NoDataPage
        onDataViewCreated={onDataViewCreated}
        onESQLNavigationComplete={onESQLNavigationComplete}
        {...noDataDependencies}
      />
    );
  } else if (!loading && currentDataView) {
    mainContent = (
      <RuntimeStateProvider currentDataView={currentDataView} adHocDataViews={adHocDataViews}>
        <DiscoverMainAppMemoized stateContainer={stateContainer} />
      </RuntimeStateProvider>
    );
  } else {
    mainContent = loadingIndicator;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={stateContainer}>
        <rootProfileState.AppWrapper>
          <QueryClientProvider client={new QueryClient()}>
            <DiscoverTopNavInline
              stateContainer={stateContainer}
              hideNavMenuItems={loading || noDataState.showNoDataPage}
            />
          </QueryClientProvider>
          {mainContent}
        </rootProfileState.AppWrapper>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverMainRoute;

const NoDataPage = ({
  onDataViewCreated,
  onESQLNavigationComplete,
  ...noDataDependencies
}: AnalyticsNoDataPageKibanaDependencies & AnalyticsNoDataPageProps) => {
  const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
  const AnalyticsNoDataPageKibanaProvider = withSuspense(
    lazy(async () => ({ default: (await importPromise).AnalyticsNoDataPageKibanaProvider }))
  );
  const AnalyticsNoDataPage = withSuspense(
    lazy(async () => ({ default: (await importPromise).AnalyticsNoDataPage }))
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

function getLoadParamsForNewSearch({
  stateContainer,
  runtimeStateManager,
}: {
  stateContainer: DiscoverStateContainer;
  runtimeStateManager: RuntimeStateManager;
}): {
  nextDataView: LoadParams['dataView'];
  initialAppState: LoadParams['initialAppState'];
} {
  const prevAppState = stateContainer.appState.getState();
  const prevDataView = runtimeStateManager.currentDataView$.getValue();
  const initialAppState =
    isDataSourceType(prevAppState.dataSource, DataSourceType.Esql) &&
    prevDataView &&
    prevDataView.type === ESQL_TYPE
      ? {
          // reset to a default ES|QL query
          query: {
            esql: getInitialESQLQuery(prevDataView),
          },
        }
      : undefined;
  return {
    nextDataView: prevDataView,
    initialAppState,
  };
}
