/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { useUrl } from './hooks/use_url';
import { useSingleton } from './hooks/use_singleton';
import { MainHistoryLocationState } from '../../../common/locator';
import { DiscoverStateContainer, getDiscoverStateContainer } from './services/discover_state';
import { DiscoverMainApp } from './discover_main_app';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getScopedHistory, getUrlTracker } from '../../kibana_services';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { DiscoverMainProvider } from './services/discover_state_provider';
import {
  CustomizationCallback,
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../customizations';
import type { DiscoverCustomizationContext } from '../types';
import { DiscoverTopNavServerless } from './components/top_nav/discover_topnav_serverless';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

export interface MainRouteProps {
  customizationCallbacks: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  isDev: boolean;
  customizationContext: DiscoverCustomizationContext;
}

export function DiscoverMainRoute({
  customizationCallbacks,
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
  } = services;
  const { id: savedSearchId } = useParams<DiscoverLandingParams>();
  const stateContainer = useSingleton<DiscoverStateContainer>(() =>
    getDiscoverStateContainer({
      history,
      services,
      customizationContext,
      stateStorageContainer,
    })
  );
  const { customizationService, isInitialized: isCustomizationServiceInitialized } =
    useDiscoverCustomizationService({
      customizationCallbacks,
      stateContainer,
    });
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [hasESData, setHasESData] = useState(false);
  const [hasUserDataView, setHasUserDataView] = useState(false);
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  /**
   * Get location state of scoped history only on initial load
   */
  const historyLocationState = useMemo(
    () => getScopedHistory().location.state as MainHistoryLocationState | undefined,
    []
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

  const checkData = useCallback(async () => {
    try {
      if (savedSearchId) {
        return true; // bypass NoData screen
      }
      const hasUserDataViewValue = await data.dataViews.hasData
        .hasUserDataView()
        .catch(() => false);
      const hasESDataValue = await data.dataViews.hasData.hasESData().catch(() => false);
      setHasUserDataView(hasUserDataViewValue);
      setHasESData(hasESDataValue);

      if (!hasUserDataViewValue) {
        setShowNoDataPage(true);
        return false;
      }

      let defaultDataViewExists: boolean = false;
      try {
        defaultDataViewExists = await data.dataViews.defaultDataViewExists();
      } catch (e) {
        //
      }

      if (!defaultDataViewExists) {
        setShowNoDataPage(true);
        return false;
      }
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }, [data.dataViews, savedSearchId]);

  const loadSavedSearch = useCallback(
    async (nextDataView?: DataView) => {
      const loadSavedSearchStartTime = window.performance.now();
      setLoading(true);
      if (!nextDataView && !(await checkData())) {
        setLoading(false);
        return;
      }
      try {
        await stateContainer.actions.loadDataViewList();

        const currentSavedSearch = await stateContainer.actions.loadSavedSearch({
          savedSearchId,
          dataView: nextDataView,
          dataViewSpec: historyLocationState?.dataViewSpec,
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
              getUrlTracker().setTrackedUrl('/');
            },
            theme: core.theme,
          })(e);
        } else {
          setError(e);
        }
      }
    },
    [
      checkData,
      stateContainer.actions,
      savedSearchId,
      historyLocationState?.dataViewSpec,
      customizationContext.displayMode,
      services,
      chrome.recentlyAccessed,
      history,
      core.application.navigateToApp,
      core.theme,
      basePath,
      toastNotifications,
    ]
  );

  useEffect(() => {
    if (!isCustomizationServiceInitialized) return;

    setLoading(true);
    setHasESData(false);
    setHasUserDataView(false);
    setShowNoDataPage(false);
    setError(undefined);
    // restore the previously selected data view for a new state
    loadSavedSearch(!savedSearchId ? stateContainer.internalState.getState().dataView : undefined);
  }, [isCustomizationServiceInitialized, loadSavedSearch, savedSearchId, stateContainer]);

  // secondary fetch: in case URL is set to `/`, used to reset to 'new' state, keeping the current data view
  useUrl({
    history,
    savedSearchId,
    onNewUrl: () => {
      // restore the previously selected data view for a new state
      const dataView = stateContainer.internalState.getState().dataView;
      loadSavedSearch(dataView);
    },
  });

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      if (nextDataView) {
        setLoading(true);
        setShowNoDataPage(false);
        setError(undefined);
        await loadSavedSearch(nextDataView as DataView);
      }
    },
    [loadSavedSearch]
  );

  const noDataDependencies = useMemo(
    () => ({
      coreStart: core,
      dataViews: {
        ...data.dataViews,
        hasData: {
          ...data.dataViews.hasData,

          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
      dataViewEditor,
      noDataPage: services.noDataPage,
    }),
    [core, data.dataViews, dataViewEditor, hasESData, hasUserDataView, services.noDataPage]
  );

  const loadingIndicator = useMemo(
    () => <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />,
    [hasCustomBranding]
  );

  const mainContent = useMemo(() => {
    if (showNoDataPage) {
      return (
        <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
          <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />
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
    showNoDataPage,
    stateContainer,
  ]);

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (!customizationService) {
    return loadingIndicator;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={stateContainer}>
        <>
          <DiscoverTopNavServerless stateContainer={stateContainer} hideNavMenuItems={loading} />
          {mainContent}
        </>
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
}
// eslint-disable-next-line import/no-default-export
export default DiscoverMainRoute;
