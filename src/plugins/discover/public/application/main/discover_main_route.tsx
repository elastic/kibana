/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { DataViewSavedObjectConflictError } from '@kbn/data-views-plugin/public';
import { redirectWhenMissing } from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import {
  AnalyticsNoDataPage,
  AnalyticsNoDataPageKibanaProvider,
} from '@kbn/shared-ux-page-analytics-no-data';
import { addLog } from '../../utils/add_log';
import { DiscoverMainProvider } from './services/discover_state_react';
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
      stateContainer.actions.stopSyncSubscribe();
      await stateContainer.actions.loadDataViewList();
      if (isNewSavedSearch) {
        addLog('[Main route] load new saved search');
        await stateContainer.actions.loadNewSavedSearch(
          props.historyLocationState?.dataViewSpec,
          setError
        );
      } else {
        addLog('[Main route] load saved search', id);
        await stateContainer.actions.loadSavedSearch(
          id,
          props.historyLocationState?.dataViewSpec,
          setError
        );
      }
      setLoading(false);
    } catch (e) {
      if (e instanceof DataViewSavedObjectConflictError) {
        setError(e);
      } else {
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
      }
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
