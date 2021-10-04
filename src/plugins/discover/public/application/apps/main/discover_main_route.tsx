/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState, memo, useCallback } from 'react';
import { History } from 'history';
import { useParams } from 'react-router-dom';
import type { SavedObject as SavedObjectDeprecated } from 'src/plugins/saved_objects/public';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';
import { getState } from './services/discover_state';
import { loadIndexPattern, resolveIndexPattern } from './utils/resolve_index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../../helpers/breadcrumbs';
import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { getUrlTracker } from '../../../kibana_services';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { IndexPattern } from '../../../../../data/common';

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

export interface DiscoverDataViewEntry {
  id: string;
  title: string;
  tmp?: boolean;
  timeFieldName?: string;
  dataView?: IndexPattern;
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
  const [indexPatternList, setIndexPatternList] = useState<DiscoverDataViewEntry[]>([]);
  const [indexPatternTimefield, setIndexPatternTimefield] = useState<string>('');

  const { id } = useParams<DiscoverLandingParams>();
  const onAddIndexPattern = useCallback(
    async (value: string) => {
      setSavedSearch(undefined);
      const newIndexPatternList = [...indexPatternList];
      const newIndexPattern = await data.indexPatterns.create({ id: value, title: value });
      newIndexPattern.tmp = true;
      newIndexPattern.timeFieldName = '';
      setIndexPatternList(newIndexPatternList);
      savedSearch!.searchSource.setField('index', newIndexPattern);
      setSavedSearch(savedSearch);
    },
    [data.indexPatterns, indexPatternList, savedSearch]
  );

  useEffect(() => {
    const savedSearchId = id;

    async function loadDefaultOrCurrentIndexPattern(usedSavedSearch: SavedSearch) {
      const newIndexPatternList: DiscoverDataViewEntry[] = [];
      await data.indexPatterns.ensureDefaultDataView();
      const { appStateContainer } = getState({ history, uiSettings: config });
      const { index } = appStateContainer.getState();
      const idTitleList = await data.indexPatterns.getIdsWithTitle();
      for (const entry of idTitleList) {
        newIndexPatternList.push({ id: entry.id, title: entry.title });
      }
      const ip = await loadIndexPattern(index || '', data.indexPatterns, idTitleList, config);

      if (index && !ip.stateValFound) {
        const newIndexPattern = await data.indexPatterns.create({ id: index, title: index });
        newIndexPattern.tmp = true;
        newIndexPattern.timeFieldName = indexPatternTimefield;
        ip.loaded = newIndexPattern;
        ip.stateVal = String(index);
        ip.stateValFound = true;
        newIndexPatternList.push({ id: index, title: index, tmp: true, dataView: newIndexPattern });
      }
      const indexPatternData = await resolveIndexPattern(
        ip,
        usedSavedSearch.searchSource,
        toastNotifications
      );
      newIndexPatternList.sort((a, b) => (a.title > b.title ? 1 : -1));

      setIndexPatternList(newIndexPatternList);
      return indexPatternData;
    }

    async function loadSavedSearch() {
      try {
        // force a refresh if a given saved search without id was saved
        setSavedSearch(undefined);
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
    indexPatternTimefield,
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
      setIndexPatternTimefield={setIndexPatternTimefield}
      onAddIndexPattern={onAddIndexPattern}
    />
  );
}
