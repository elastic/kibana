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
    navigateTo: (path: string) => void;
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
  const { opts } = props;
  const { services, history } = opts;
  const {
    chrome,
    uiSettings: config,
    data,
    toastNotifications,
    core,
    http: { basePath },
  } = services;

  const [savedSearch, setSavedSearch] = useState<SavedSearch>();
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();
  const [indexPatternList, setIndexPatternList] = useState<
    Array<SavedObject<IndexPatternAttributes>>
  >(opts.indexPatternList);

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
        if (loadedSavedSearch) {
          setIndexPattern(loadedSavedSearch.searchSource.getField('index'));
        }
      }
    }

    if (!savedSearch || (savedSearch && savedSearchId !== savedSearch.id)) {
      loadSavedSearch();
    }
  }, [
    chrome.recentlyAccessed,
    config,
    data.indexPatterns,
    history,
    id,
    indexPatternList.length,
    props.opts,
    savedSearch,
    services,
    toastNotifications,
  ]);

  useEffect(() => {
    async function loadDefaultOrCurrentIndexPattern() {
      if (!savedSearch || id) {
        return;
      }
      await data.indexPatterns.ensureDefaultIndexPattern();
      const { appStateContainer } = getState({ history, uiSettings: config });
      const { index } = appStateContainer.getState();
      const ip = await loadIndexPattern(index || '', data.indexPatterns, config);
      const ipList = ip.list as Array<SavedObject<IndexPatternAttributes>>;
      const indexPatternData = await resolveIndexPattern(
        ip,
        savedSearch?.searchSource,
        toastNotifications
      );
      setIndexPattern(indexPatternData);
      if (indexPatternList.length === 0) {
        setIndexPatternList(ipList);
      }
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
    indexPatternList.length,
  ]);

  useEffect(() => {
    chrome.setBreadcrumbs(
      savedSearch ? getSavedSearchBreadcrumbs(savedSearch.title) : getRootBreadcrumbs()
    );
  }, [chrome, savedSearch]);

  if (!indexPattern || !savedSearch) {
    return null;
  }

  return (
    <DiscoverMainApp
      indexPattern={indexPattern}
      opts={{ ...props.opts, savedSearch, indexPatternList }}
    />
  );
}
