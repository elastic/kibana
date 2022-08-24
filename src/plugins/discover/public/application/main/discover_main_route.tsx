/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { SavedObject } from '@kbn/data-plugin/public';
import { ISearchSource } from '@kbn/data-plugin/public';
import {
  DataViewAttributes,
  DataViewSavedObjectConflictError,
} from '@kbn/data-views-plugin/public';
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
import { getState } from './services/discover_state';
import { loadDataView, resolveDataView } from './utils/resolve_data_view';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getUrlTracker } from '../../kibana_services';
import { restoreStateFromSavedSearch } from '../../services/saved_searches/restore_from_saved_search';

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
  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const dataView = savedSearch?.searchSource?.getField('index');
  const [dataViewList, setDataViewList] = useState<Array<SavedObject<DataViewAttributes>>>([]);
  const { id } = useParams<DiscoverLandingParams>();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: id || 'new',
  });

  const hasDataView = useCallback(async () => {
    const hasUserDataViewValue = await data.dataViews.hasData.hasUserDataView().catch(() => false);

    if (!hasUserDataViewValue) {
      return false;
    }

    const defaultDataView = await data.dataViews.getDefaultDataView();

    if (!defaultDataView) {
      return false;
    }

    return await data.dataViews.hasData.hasDataView();
  }, [data.dataViews]);

  const loadDefaultOrCurrentDataView = useCallback(
    async (searchSource: ISearchSource) => {
      try {
        // eslint-disable-next-line no-console
        console.log('loadDefaultOrCurrentDataView');
        const hasView = await hasDataView();
        // eslint-disable-next-line no-console
        console.log('loadDefaultOrCurrentDataView - hasView', hasView);

        if (!hasView) {
          return;
        }

        const { appStateContainer } = getState({ history, uiSettings: config });
        const { index } = appStateContainer.getState();
        const ip = await loadDataView(index || '', data.dataViews, config);

        const ipList = ip.list as Array<SavedObject<DataViewAttributes>>;
        const dataViewData = resolveDataView(ip, searchSource, toastNotifications);
        await data.dataViews.refreshFields(dataViewData);
        setDataViewList(ipList);

        return dataViewData;
      } catch (e) {
        setError(e);
      }
    },
    [config, data.dataViews, history, toastNotifications, hasDataView]
  );

  const loadSavedSearch = useCallback(async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('loadSavedSearch');
      const currentSavedSearch = await getSavedSearch(id, {
        search: services.data.search,
        savedObjectsClient: core.savedObjects.client,
        spaces: services.spaces,
      });

      const currentDataView = await loadDefaultOrCurrentDataView(currentSavedSearch.searchSource);
      // eslint-disable-next-line no-console
      console.log('loadSavedSearch - currentDataView', currentDataView);

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
    id,
    services.data,
    services.spaces,
    services.timefilter,
    core.savedObjects.client,
    core.application.navigateToApp,
    core.theme,
    loadDefaultOrCurrentDataView,
    chrome.recentlyAccessed,
    history,
    basePath,
    toastNotifications,
  ]);

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      // eslint-disable-next-line no-console
      console.log('onDataViewCreated', nextDataView);
      if (nextDataView) {
        setError(undefined);
        await loadSavedSearch();
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

  const analyticsServices = {
    coreStart: core,
    dataViews: {
      ...data.dataViews,
      hasData: {
        ...data.dataViews.hasData,
        // If we're in dev mode, we want to always return true here.
        hasESData: isDev ? () => Promise.resolve(true) : data.dataViews.hasData.hasESData,
        hasDataView,
      },
    },
    dataViewEditor,
  };

  const Discover = () => {
    // eslint-disable-next-line no-console
    console.log('render Discover');
    if (error) {
      return <DiscoverError error={error} />;
    }

    if (!dataView || !savedSearch) {
      return <LoadingIndicator type="elastic" />;
    }

    return <DiscoverMainAppMemoized dataViewList={dataViewList} savedSearch={savedSearch} />;
  };

  return (
    <AnalyticsNoDataPageKibanaProvider {...analyticsServices}>
      <AnalyticsNoDataPage onDataViewCreated={onDataViewCreated}>{Discover()}</AnalyticsNoDataPage>
    </AnalyticsNoDataPageKibanaProvider>
  );
}
