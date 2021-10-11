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
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { DiscoverMainApp } from './discover_main_app';
import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { getUrlTracker } from '../../../kibana_services';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverContext } from './services/discover_context';
import { useDataViews } from '../../services/use_data_views';

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
function useSavedSearchStore(services: DiscoverServices, history: History) {
  const {
    core,
    chrome,
    uiSettings,
    data,
    toastNotifications,
    http: { basePath },
  } = services;
  const [savedSearch, setSavedSearch] = useState<SavedSearch>();

  const { id } = useParams<DiscoverLandingParams>();

  useEffect(() => {
    const savedSearchId = id;

    async function loadSavedSearch() {
      try {
        const loadedSavedSearch = await services.getSavedSearchById(savedSearchId);
        await data.indexPatterns.ensureDefaultDataView();
        /** this would need a rewrite
         const indexPatternData = await resolveIndexPattern(
         ip,
         loadedSavedSearch.searchSource,
         toastNotifications
         );
         **/
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
    uiSettings,
    core.application.navigateToApp,
    data.indexPatterns,
    history,
    id,
    services,
    toastNotifications,
  ]);

  return savedSearch;
}

export function DiscoverMainRoute({ services, history }: DiscoverMainProps) {
  const dataViews = useDataViews(services);
  const savedSearch = useSavedSearchStore(services, history);
  const { list } = dataViews;

  if (!savedSearch || !list) {
    return <LoadingIndicator />;
  }

  return (
    <DiscoverContext.Provider value={{ dataViews }}>
      <DiscoverMainAppMemoized
        history={history}
        indexPatternList={list}
        savedSearch={savedSearch}
        services={services}
      />
    </DiscoverContext.Provider>
  );
}
