/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
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
import { useUrl } from './hooks/use_url';
import { useDiscoverStateContainer } from './hooks/use_discover_state_container';
import { MainHistoryLocationState } from '../../../common';
import { DiscoverMainApp } from './discover_main_app';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { DiscoverMainProvider } from './state_management/discover_state_provider';
import {
  CustomizationCallback,
  DiscoverCustomizationContext,
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../customizations';
import { DiscoverStateContainer, LoadParams } from './state_management/discover_state';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import { useDefaultAdHocDataViews, useRootProfile } from '../../context_awareness';

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
  const [stateContainer, { reset: resetStateContainer }] = useDiscoverStateContainer({
    history,
    services,
    customizationContext,
    stateStorageContainer,
  });
  const { customizationService, isInitialized: isCustomizationServiceInitialized } =
    useDiscoverCustomizationService({
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
        const adHocDataViewsExist =
          stateContainer.internalState.getState().adHocDataViews.length > 0;
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
    [data.dataViews, historyLocationState?.dataViewSpec, savedSearchId, stateContainer]
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
    if (!isCustomizationServiceInitialized || rootProfileState.rootProfileLoading) {
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
        await loadSavedSearch(getLoadParamsForNewSearch(stateContainer));
      }
    };

    load();
  }, [
    initializeProfileDataViews,
    isCustomizationServiceInitialized,
    loadSavedSearch,
    rootProfileState.rootProfileLoading,
    savedSearchId,
    stateContainer,
  ]);

  // secondary fetch: in case URL is set to `/`, used to reset to 'new' state, keeping the current data view
  useUrl({
    history,
    savedSearchId,
    onNewUrl: () => {
      // restore the previously selected data view for a new state
      loadSavedSearch(getLoadParamsForNewSearch(stateContainer));
    },
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

  const noDataDependencies = useMemo(
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

  const loadingIndicator = useMemo(
    () => <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />,
    [hasCustomBranding]
  );

  const mainContent = useMemo(() => {
    if (noDataState.showNoDataPage) {
      const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
      const AnalyticsNoDataPageKibanaProvider = withSuspense(
        React.lazy(() =>
          importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
            return { default: NoDataProvider };
          })
        )
      );
      const AnalyticsNoDataPage = withSuspense(
        React.lazy(() =>
          importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
            return { default: NoDataPage };
          })
        )
      );

      return (
        <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
          <AnalyticsNoDataPage
            onDataViewCreated={onDataViewCreated}
            onESQLNavigationComplete={onESQLNavigationComplete}
          />
        </AnalyticsNoDataPageKibanaProvider>
      );
    }

    if (loading) {
      return loadingIndicator;
    }

    return <DiscoverMainAppMemoized stateContainer={stateContainer} />;
  }, [
    loading,
    loadingIndicator,
    noDataDependencies,
    onDataViewCreated,
    onESQLNavigationComplete,
    noDataState.showNoDataPage,
    stateContainer,
  ]);

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (!customizationService || rootProfileState.rootProfileLoading) {
    return loadingIndicator;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={stateContainer}>
        <rootProfileState.AppWrapper>{mainContent}</rootProfileState.AppWrapper>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
}
// eslint-disable-next-line import/no-default-export
export default DiscoverMainRoute;

function getLoadParamsForNewSearch(stateContainer: DiscoverStateContainer): {
  nextDataView: LoadParams['dataView'];
  initialAppState: LoadParams['initialAppState'];
} {
  const prevAppState = stateContainer.appState.getState();
  const prevDataView = stateContainer.internalState.getState().dataView;
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
