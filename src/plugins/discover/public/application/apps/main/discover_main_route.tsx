/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { History } from 'history';
import { useParams } from 'react-router-dom';
import { SavedObject as SavedObjectDeprecated } from 'src/plugins/saved_objects/target/types/public';
import { IndexPattern, IndexPatternAttributes, SavedObject } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { getState } from './services/discover_state';
import { loadIndexPattern, resolveIndexPattern } from './utils/resolve_index_pattern';
import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { getUrlTracker } from '../../../kibana_services';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../helpers/breadcrumbs';

export interface DiscoverMainProps {
  opts: {
    /**
     * Use angular router for navigation
     */
    navigateTo: () => void;
    /**
     * Instance of browser history
     */
    history: History;
    /**
     * List of available index patterns
     */
    indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
    /**
     * Kibana core services used by discover
     */
    services: DiscoverServices;
  };
}

interface DiscoverLandingParams {
  id: string;
}

export function DiscoverMainRoute(props: DiscoverMainProps) {
  const { services, history } = props.opts;
  const {
    chrome,
    uiSettings: config,
    data,
    toastNotifications,
    core,
    http: { basePath }
  } = services;

  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  const { id } = useParams<DiscoverLandingParams>();

  useEffect(() => {
    const savedSearchId = id;

    async function loadSavedSearch() {
      const loadedSavedSearch = await services.getSavedSearchById(savedSearchId);
      setSavedSearch(loadedSavedSearch);
      if (savedSearchId) {
        chrome.recentlyAccessed.add(
          ((loadedSavedSearch as unknown) as SavedObjectDeprecated).getFullPath(),
          loadedSavedSearch.title,
          loadedSavedSearch.id
        );
      }
    }

    loadSavedSearch();
  }, [chrome.recentlyAccessed, id, services]);

  useEffect(() => {
    async function loadDefaultOrCurrentIndexPattern() {
      if (!savedSearch) {
        return;
      }
      await data.indexPatterns.ensureDefaultIndexPattern();
      const { appStateContainer } = getState({ history, uiSettings: config });
      const { index } = appStateContainer.getState();
      const ip = await loadIndexPattern(index || '', data.indexPatterns, config);
      const indexPatternData = await resolveIndexPattern(
        ip,
        savedSearch?.searchSource,
        toastNotifications
      );
      setIndexPattern(indexPatternData);
    }

    try {
      loadDefaultOrCurrentIndexPattern();
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
      });
    }
  }, [
    chrome.recentlyAccessed,
    data.indexPatterns,
    history,
    savedSearch,
    id,
    config,
    toastNotifications,
    core.application.navigateToApp,
    basePath,
  ]);

  useEffect(() => {
    chrome.setBreadcrumbs(id ? getSavedSearchBreadcrumbs(id) : getRootBreadcrumbs());
  }, [chrome, id]);

  if (!indexPattern || !savedSearch) {
    return null;
  }

  const opts = {
    ...props.opts,
    savedSearch,
  };

  return <DiscoverMainApp indexPattern={indexPattern} opts={opts} />;
}
