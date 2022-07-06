/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo, useCallback } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
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
} from '../../services/saved_searches';
import { getState } from './services/discover_state';
import { loadIndexPattern, resolveIndexPattern } from './utils/resolve_index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getUrlTracker } from '../../kibana_services';

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
  const indexPattern = savedSearch?.searchSource?.getField('index');
  const [indexPatternList, setIndexPatternList] = useState<Array<SavedObject<DataViewAttributes>>>(
    []
  );
  const [hasESData, setHasESData] = useState(false);
  const [hasUserDataView, setHasUserDataView] = useState(false);
  const [showNoDataPage, setShowNoDataPage] = useState<boolean>(false);
  const { id } = useParams<DiscoverLandingParams>();

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: id || 'new',
  });

  const loadDefaultOrCurrentIndexPattern = useCallback(
    async (searchSource: ISearchSource) => {
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

        const defaultDataView = await data.dataViews.getDefaultDataView();

        if (!defaultDataView) {
          setShowNoDataPage(true);
          return;
        }

        const { appStateContainer } = getState({ history, uiSettings: config });
        const { index } = appStateContainer.getState();
        const ip = await loadIndexPattern(index || '', data.dataViews, config);

        const ipList = ip.list as Array<SavedObject<DataViewAttributes>>;
        const indexPatternData = resolveIndexPattern(ip, searchSource, toastNotifications);

        setIndexPatternList(ipList);

        return indexPatternData;
      } catch (e) {
        setError(e);
      }
    },
    [config, data.dataViews, history, isDev, toastNotifications]
  );

  const loadSavedSearch = useCallback(
    async (dataview?: DataView) => {
      try {
        const currentSavedSearch = await getSavedSearch(id, {
          search: services.data.search,
          savedObjectsClient: core.savedObjects.client,
          spaces: services.spaces,
        });
        const loadedIndexPattern = dataview
          ? dataview
          : await loadDefaultOrCurrentIndexPattern(currentSavedSearch.searchSource);

        if (!loadedIndexPattern) {
          return;
        }

        if (!currentSavedSearch.searchSource.getField('index')) {
          currentSavedSearch.searchSource.setField('index', loadedIndexPattern);
        }

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
    },
    [
      id,
      services.data.search,
      services.spaces,
      core.savedObjects.client,
      core.application.navigateToApp,
      core.theme,
      loadDefaultOrCurrentIndexPattern,
      chrome.recentlyAccessed,
      history,
      basePath,
      toastNotifications,
    ]
  );

  const onDataViewCreated = useCallback(
    async (dataView: unknown) => {
      if (dataView) {
        setShowNoDataPage(false);
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

  if (!indexPattern || !savedSearch) {
    return <LoadingIndicator type="elastic" />;
  }

  return <DiscoverMainAppMemoized indexPatternList={indexPatternList} savedSearch={savedSearch} />;
}
