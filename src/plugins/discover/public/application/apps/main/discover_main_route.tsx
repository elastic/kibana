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
import type { SavedObject as SavedObjectDeprecated } from 'src/plugins/saved_objects/public';
import { IndexPatternAttributes, SavedObject } from 'src/plugins/data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { getState } from './services/discover_state';
import { loadIndexPattern, resolveIndexPattern } from './utils/resolve_index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../helpers/breadcrumbs';
import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { getUrlTracker } from '../../../kibana_services';
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

export function DiscoverMainRoute({ services, history }: DiscoverMainProps) {
  const {
    core,
    chrome,
    uiSettings: config,
    data,
    toastNotifications,
    http: { basePath },
  } = services;

  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const indexPattern = savedSearch?.searchSource?.getField('index');
  const [indexPatternList, setIndexPatternList] = useState<
    Array<SavedObject<IndexPatternAttributes>>
  >([]);

  const { id } = useParams<DiscoverLandingParams>();

  useEffect(() => {
    const savedSearchId = id;

    async function loadDefaultOrCurrentIndexPattern(usedSavedSearch: SavedSearch) {
      await data.indexPatterns.ensureDefaultDataView();
      const { appStateContainer } = getState({ history, uiSettings: config });
      const { index } = appStateContainer.getState();
      const ip = await loadIndexPattern(index || '', data.indexPatterns, config);
      const ipList = ip.list as Array<SavedObject<IndexPatternAttributes>>;
      const indexPatternData = await resolveIndexPattern(
        ip,
        usedSavedSearch.searchSource,
        toastNotifications
      );
      setIndexPatternList(ipList);
      return indexPatternData;
    }

    async function loadSavedSearch() {
      try {
        const loadedSavedSearch = await services.getSavedSearchById(savedSearchId);
        const loadedIndexPattern = await loadDefaultOrCurrentIndexPattern(loadedSavedSearch);
        if (loadedSavedSearch && !loadedSavedSearch?.searchSource.getField('index')) {
          loadedSavedSearch.searchSource.setField('index', loadedIndexPattern);
        }
        setSavedSearch(loadedSavedSearch);
        if (savedSearchId) {
          chrome.recentlyAccessed.add(
            (loadedSavedSearch as unknown as SavedObjectDeprecated).getFullPath(),
            loadedSavedSearch.title,
            loadedSavedSearch.id
          );
        }
      } catch (e) {
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

    loadSavedSearch();
  }, [
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
