/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo } from 'react';
import { History } from 'history';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

import { IndexPatternAttributes, ISearchSource, SavedObject } from 'src/plugins/data/common';
import { DiscoverServices } from '../../build_services';
import {
  SavedSearch,
  getSavedSearch,
  getSavedSearchFullPathUrl,
} from '../../services/saved_searches';
import { getState } from './services/discover_state';
import { loadIndexPattern, resolveIndexPattern } from './utils/resolve_index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../utils/breadcrumbs';
import { redirectWhenMissing } from '../../../../kibana_utils/public';
import { DataViewSavedObjectConflictError } from '../../../../data_views/common';
import { getUrlTracker } from '../../kibana_services';
import { LoadingIndicator } from '../../components/common/loading_indicator';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

export interface DiscoverMainProps {
  /**
   * Instance of browser history
   */
  history: History;
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}

interface DiscoverLandingParams {
  id: string;
}

const DiscoverError = ({ error }: { error: Error }) => (
  <EuiEmptyPrompt
    iconType="alert"
    iconColor="danger"
    title={
      <h2>
        {i18n.translate('discover.discoverError.title', {
          defaultMessage: 'Error loading Discover',
        })}
      </h2>
    }
    body={<p>{error.message}</p>}
  />
);

export function DiscoverMainRoute({ services, history }: DiscoverMainProps) {
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
  const indexPattern = savedSearch?.searchSource?.getField('index');
  const [indexPatternList, setIndexPatternList] = useState<
    Array<SavedObject<IndexPatternAttributes>>
  >([]);

  const { id } = useParams<DiscoverLandingParams>();

  useEffect(() => {
    const savedSearchId = id;

    async function loadDefaultOrCurrentIndexPattern(searchSource: ISearchSource) {
      try {
        await data.indexPatterns.ensureDefaultDataView();
        const { appStateContainer } = getState({ history, uiSettings: config });
        const { index } = appStateContainer.getState();
        const ip = await loadIndexPattern(index || '', data.indexPatterns, config);

        const ipList = ip.list as Array<SavedObject<IndexPatternAttributes>>;
        const indexPatternData = await resolveIndexPattern(ip, searchSource, toastNotifications);

        setIndexPatternList(ipList);

        return indexPatternData;
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

        const loadedIndexPattern = await loadDefaultOrCurrentIndexPattern(
          currentSavedSearch.searchSource
        );

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
    data.indexPatterns,
    history,
    id,
    services,
    toastNotifications,
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

  if (!indexPattern || !savedSearch) {
    return <LoadingIndicator />;
  }

  return (
    <DiscoverMainAppMemoized
      history={history}
      indexPatternList={indexPatternList}
      savedSearch={savedSearch}
      services={services}
    />
  );
}
