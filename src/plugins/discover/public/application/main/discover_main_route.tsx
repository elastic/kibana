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
import { redirectWhenMissing, SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
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
import type { DiscoverDisplayMode } from '../types';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

export interface MainRouteProps {
  customizationCallbacks: CustomizationCallback[];
  isDev: boolean;
  mode?: DiscoverDisplayMode;
}

export function DiscoverMainRoute({
  customizationCallbacks,
  isDev,
  mode = 'standalone',
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
      const hasESDataValue = isDev || (await data.dataViews.hasData.hasESData().catch(() => false));
      setHasUserDataView(hasUserDataViewValue);
      setHasESData(hasESDataValue);

      if (!hasUserDataViewValue) {
        setShowNoDataPage(true);
        return false;
      }

      let defaultDataView: DataView | null = null;
      try {
        defaultDataView = await data.dataViews.getDefaultDataView({ displayErrors: false });
      } catch (e) {
        //
      }

      if (!defaultDataView) {
        setShowNoDataPage(true);
        return false;
      }
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }, [data.dataViews, isDev, savedSearchId]);

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
        if (mode === 'standalone') {
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
      stateContainer,
      savedSearchId,
      historyLocationState?.dataViewSpec,
      chrome,
      services,
      history,
      core.application.navigateToApp,
      core.theme,
      basePath,
      toastNotifications,
      mode,
    ]
  );

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

  if (showNoDataPage) {
    const analyticsServices = {
      coreStart: core,
      dataViews: {
        ...data.dataViews,
        hasData: {
          ...data.dataViews.hasData,

          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(isDev ? true : hasESData),
          hasUserDataView: () => Promise.resolve(hasUserDataView),
        },
      },
      dataViewEditor,
    };

    return (
      <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} />
      </AnalyticsNoDataPageKibanaProvider>
    );
  }

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (loading || !customizationService) {
    return <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverMainAppMemoized stateContainer={stateContainer} mode={mode} />
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
}
// eslint-disable-next-line import/no-default-export
export default DiscoverMainRoute;
