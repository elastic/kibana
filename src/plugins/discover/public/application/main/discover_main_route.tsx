/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { DataViewListItem } from '@kbn/data-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { DataViewSavedObjectConflictError, type DataView } from '@kbn/data-views-plugin/public';
import { redirectWhenMissing } from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import {
  AnalyticsNoDataPageKibanaProvider,
  AnalyticsNoDataPage,
} from '@kbn/shared-ux-page-analytics-no-data';
import {
  SavedSearch,
  getSavedSearch,
  getSavedSearchFullPathUrl,
} from '@kbn/saved-search-plugin/public';
import { MainHistoryLocationState } from '../../../common/locator';
import { getDiscoverStateContainer } from './services/discover_state';
import { loadDataView, resolveDataView } from './utils/resolve_data_view';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getScopedHistory, getUrlTracker } from '../../kibana_services';
import { restoreStateFromSavedSearch } from '../../services/saved_searches/restore_from_saved_search';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

interface Props {
  isDev: boolean;
}

export function DiscoverMainRoute(props: Props) {
  const history = useHistory();
  const services = useDiscoverServices();
  const { isDev } = props;
  const {
    core,
    chrome,
    uiSettings: config,
    data,
    toastNotifications,
    http: { basePath },
    dataViewEditor,
  } = services;
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [hasESData, setHasESData] = useState(false);
  const [hasUserDataView, setHasUserDataView] = useState(false);
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const { id } = useParams<DiscoverLandingParams>();

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
    id: id || 'new',
  });

  const loadDefaultOrCurrentDataView = useCallback(
    async (nextSavedSearch: SavedSearch) => {
      try {
        const hasUserDataViewValue = await data.dataViews.hasData
          .hasUserDataView()
          .catch(() => false);
        const hasESDataValue =
          isDev || (await data.dataViews.hasData.hasESData().catch(() => false));
        setHasUserDataView(hasUserDataViewValue);
        setHasESData(hasESDataValue);

        if (!hasUserDataViewValue) {
          setShowNoDataPage(true);
          return;
        }

        const defaultDataView = await data.dataViews.getDefaultDataView(false, false);

        if (!defaultDataView) {
          setShowNoDataPage(true);
          return;
        }

        const { appState } = getDiscoverStateContainer({
          history,
          savedSearch: nextSavedSearch,
          services,
        });
        const { index, query } = appState.getState();
        const ip = await loadDataView(
          data.dataViews,
          config,
          index,
          historyLocationState?.dataViewSpec
        );

        const ipList = ip.list;
        const isTextBasedQuery = query && isOfAggregateQueryType(query);
        const dataViewData = resolveDataView(
          ip,
          nextSavedSearch.searchSource,
          toastNotifications,
          isTextBasedQuery
        );
        setDataViewList(ipList);

        return dataViewData;
      } catch (e) {
        setError(e);
      }
    },
    [
      config,
      data.dataViews,
      history,
      isDev,
      historyLocationState?.dataViewSpec,
      toastNotifications,
      services,
    ]
  );

  const loadSavedSearch = useCallback(
    async (nextDataView?: DataView) => {
      try {
        setLoading(true);
        const currentSavedSearch = await getSavedSearch(id, {
          search: services.data.search,
          savedObjectsClient: core.savedObjects.client,
          spaces: services.spaces,
          savedObjectsTagging: services.savedObjectsTagging,
        });

        const currentDataView = nextDataView
          ? nextDataView
          : await loadDefaultOrCurrentDataView(currentSavedSearch);

        if (!currentDataView) {
          return;
        }

        if (!currentSavedSearch.searchSource.getField('index')) {
          currentSavedSearch.searchSource.setField('index', currentDataView);
        }

        restoreStateFromSavedSearch({
          savedSearch: currentSavedSearch,
          timefilter: services.timefilter,
        });

        setSavedSearch(currentSavedSearch);

        if (currentSavedSearch.id) {
          chrome.recentlyAccessed.add(
            getSavedSearchFullPathUrl(currentSavedSearch.id),
            currentSavedSearch.title ?? '',
            currentSavedSearch.id
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
    },
    [
      id,
      services.data,
      services.spaces,
      services.timefilter,
      services.savedObjectsTagging,
      core.savedObjects.client,
      core.application.navigateToApp,
      core.theme,
      loadDefaultOrCurrentDataView,
      chrome.recentlyAccessed,
      history,
      basePath,
      toastNotifications,
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
    loadSavedSearch();
  }, [loadSavedSearch]);

  useEffect(() => {
    chrome.setBreadcrumbs(
      savedSearch && savedSearch.title
        ? getSavedSearchBreadcrumbs(savedSearch.title)
        : getRootBreadcrumbs()
    );
  }, [chrome, savedSearch]);

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
        <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated} allowAdHocDataView />
      </AnalyticsNoDataPageKibanaProvider>
    );
  }

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (loading || !savedSearch) {
    return <LoadingIndicator type="elastic" />;
  }

  return <DiscoverMainAppMemoized dataViewList={dataViewList} savedSearch={savedSearch} />;
}
