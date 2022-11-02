/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { redirectWhenMissing, SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import {
  AnalyticsNoDataPage,
  AnalyticsNoDataPageKibanaProvider,
} from '@kbn/shared-ux-page-analytics-no-data';
import { DiscoverMainProvider } from './services/discover_state_provider';
import { useSingleton } from './hooks/use_singleton';
import { DiscoverStateContainer, getDiscoverStateContainer } from './services/discover_state';
import { DiscoverMainApp } from './discover_main_app';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getUrlTracker } from '../../kibana_services';
import { HistoryLocationState } from '../../locator';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

interface Props {
  isDev: boolean;
  historyLocationState?: HistoryLocationState;
}

export function DiscoverMainRoute(props: Props) {
  const history = useHistory();
  const services = useDiscoverServices();
  const { isDev } = props;
  const {
    core,
    data,
    toastNotifications,
    http: { basePath },
    dataViewEditor,
  } = services;
  const stateContainer = useSingleton<DiscoverStateContainer>(() =>
    getDiscoverStateContainer({
      history,
      services,
    })
  );
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [hasESData, setHasESData] = useState(false);
  const [hasUserDataView, setHasUserDataView] = useState(false);
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const { id } = useParams<DiscoverLandingParams>();
  useEffect(() => {
    setLoading(true);
  }, [id]);

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: id || 'new',
  });

  useEffect(() => {
    const checkData = async () => {
      const hasUserDataViewValue = await data.dataViews.hasData
        .hasUserDataView()
        .catch(() => false);
      const hasESDataValue = isDev || (await data.dataViews.hasData.hasESData().catch(() => false));
      setHasUserDataView(hasUserDataViewValue);
      setHasESData(hasESDataValue);

      if (!hasUserDataViewValue) {
        setShowNoDataPage(true);
        return;
      }

      const defaultDataView = await data.dataViews.getDefaultDataView();

      if (!defaultDataView) {
        setShowNoDataPage(true);
        return;
      }
    };
    checkData();
  }, [data.dataViews, isDev]);

  const checkDataAndLoadSavedSearch = useCallback(async () => {
    try {
      const isNewSavedSearch = !Boolean(id);
      stateContainer.actions.unsubscribe();
      await stateContainer.actions.loadDataViewList();
      if (isNewSavedSearch) {
        await stateContainer.actions.loadNewSavedSearch(props.historyLocationState?.dataViewSpec);
      } else {
        await stateContainer.actions.loadSavedSearch(id, props.historyLocationState?.dataViewSpec);
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
              path: `kibana/objects/savedSearches/${id}`,
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
    } finally {
      setLoading(false);
    }
  }, [
    basePath,
    core.application.navigateToApp,
    core.theme,
    history,
    id,
    props.historyLocationState?.dataViewSpec,
    stateContainer.actions,
    toastNotifications,
  ]);

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      if (nextDataView) {
        setLoading(true);
        setShowNoDataPage(false);
        setError(undefined);
        await checkDataAndLoadSavedSearch();
      }
    },
    [checkDataAndLoadSavedSearch]
  );

  useEffect(() => {
    checkDataAndLoadSavedSearch();
  }, [checkDataAndLoadSavedSearch]);

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

  if (loading) {
    return <LoadingIndicator type="elastic" />;
  }

  return (
    <DiscoverMainProvider value={stateContainer}>
      <DiscoverMainAppMemoized stateContainer={stateContainer} />
    </DiscoverMainProvider>
  );
}
