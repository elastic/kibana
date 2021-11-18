/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect } from 'react';
import { History } from 'history';
import { DiscoverLayout } from './components/layout';
import { setBreadcrumbsTitle } from '../../helpers/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverState } from './services/use_discover_state';
import { useUrl } from './services/use_url';
import { IndexPatternAttributes, SavedObject } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
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
  /**
   * Current instance of SavedSearch
   */
  savedSearch: SavedSearch;
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { savedSearch, services, history, indexPatternList } = props;
  const { chrome, docLinks, uiSettings: config, data } = services;
  const navigateTo = useCallback(
    (path: string) => {
      history.push(path);
    },
    [history]
  );

  /**
   * State related logic
   */
  const {
    data$,
    indexPattern,
    inspectorAdapters,
    onChangeIndexPattern,
    onUpdateQuery,
    refetch$,
    resetSavedSearch,
    searchSource,
    state,
    stateContainer,
  } = useDiscoverState({
    services,
    history,
    savedSearch,
  });

  /**
   * Url / Routing logic
   */
  useUrl({ history, resetSavedSearch });

  /**
   * SavedSearch depended initializing
   */
  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);
    setBreadcrumbsTitle(savedSearch, chrome);
    return () => {
      data.search.session.clear();
    };
  }, [savedSearch, chrome, docLinks, refetch$, stateContainer, data, config]);

  /**
   * Initializing syncing with state and help menu
   */
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [stateContainer, chrome, docLinks]);

  const resetCurrentSavedSearch = useCallback(() => {
    resetSavedSearch(savedSearch.id);
  }, [resetSavedSearch, savedSearch]);

  return (
    <DiscoverLayoutMemoized
      indexPattern={indexPattern}
      indexPatternList={indexPatternList}
      inspectorAdapters={inspectorAdapters}
      onChangeIndexPattern={onChangeIndexPattern}
      onUpdateQuery={onUpdateQuery}
      resetSavedSearch={resetCurrentSavedSearch}
      navigateTo={navigateTo}
      savedSearch={savedSearch}
      savedSearchData$={data$}
      savedSearchRefetch$={refetch$}
      searchSource={searchSource}
      services={services}
      state={state}
      stateContainer={stateContainer}
    />
  );
}
