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
  SavedSearch,
  getSavedSearch,
  getSavedSearchFullPathUrl,
} from '../../services/saved_searches';
import { getState } from './services/discover_state';
import { loadDataView, resolveDataView } from './utils/resolve_index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { getUrlTracker } from '../../kibana_services';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

export function DiscoverMainRoute() {
  const history = useHistory();
  const services = useDiscoverServices();
  const {
    core,
    chrome,
    uiSettings: config,
    data,
    toastNotifications,
    http: { basePath },
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

  const navigateToOverview = useCallback(() => {
    core.application.navigateToApp('kibanaOverview', { path: '#' });
  }, [core.application]);

  const checkForDataViews = useCallback(async () => {
    const hasUserDataView = await data.dataViews.hasUserDataView().catch(() => true);
    if (!hasUserDataView) {
      navigateToOverview();
    }
    const defaultDataView = await data.dataViews.getDefaultDataView();
    if (!defaultDataView) {
      navigateToOverview();
    }
  }, [navigateToOverview, data.dataViews]);

  useEffect(() => {
    const savedSearchId = id;

    async function loadDefaultOrCurrentDataView(searchSource: ISearchSource) {
      try {
        await checkForDataViews();
        const { appStateContainer } = getState({ history, uiSettings: config });
        const { index } = appStateContainer.getState();
        const ip = await loadDataView(index || '', data.dataViews, config);

        const ipList = ip.list as Array<SavedObject<DataViewAttributes>>;
        const dataViewData = await resolveDataView(ip, searchSource, toastNotifications);

        setDataViewList(ipList);

        return dataViewData;
      } catch (e) {
        setError(e);
      }
    }

    async function loadSavedSearch() {
      try {
        const currentSavedSearch = await getSavedSearch(savedSearchId, {
          search: services.data.search,
          savedObjectsClient: core.savedObjects.client,
          spaces: services.spaces,
        });

        const currentDataView = await loadDefaultOrCurrentDataView(
          currentSavedSearch.searchSource
        );

        if (!currentDataView) {
          return;
        }

        if (!currentSavedSearch.searchSource.getField('index')) {
          currentSavedSearch.searchSource.setField('index', currentDataView);
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
    }

    loadSavedSearch();
  }, [
    core.savedObjects.client,
    basePath,
    chrome.recentlyAccessed,
    config,
    core.application.navigateToApp,
    data.dataViews,
    history,
    id,
    services,
    toastNotifications,
    core.theme,
    checkForDataViews,
  ]);

  useEffect(() => {
    chrome.setBreadcrumbs(
      savedSearch && savedSearch.title
        ? getSavedSearchBreadcrumbs(savedSearch.title)
        : getRootBreadcrumbs()
    );
  }, [chrome, savedSearch]);

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (!dataView || !savedSearch) {
    return <LoadingIndicator />;
  }

  return <DiscoverMainAppMemoized dataViewList={dataViewList} savedSearch={savedSearch} />;
}
