/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { History } from 'history';
import { DiscoverLayout } from './components/layout';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../common';
import { useSavedSearch as useSavedSearchData } from './services/use_saved_search';
import { setBreadcrumbsTitle } from '../../helpers/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverState } from './services/use_discover_state';
import { useSearchSession } from './services/use_search_session';
import { useUrl } from './services/use_url';
import { IndexPattern, IndexPatternAttributes, SavedObject } from '../../../../../data/common';
import { DiscoverServices } from '../../../build_services';
import { SavedSearch } from '../../../saved_searches';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  /**
   * Current IndexPattern
   */
  indexPattern: IndexPattern;

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
    /**
     * Current instance of SavedSearch
     */
    savedSearch: SavedSearch;
  };
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { services, history, navigateTo, indexPatternList } = props.opts;
  const { chrome, docLinks, uiSettings: config, data } = services;

  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);

  /**
   * State related logic
   */
  const {
    stateContainer,
    state,
    indexPattern,
    searchSource,
    savedSearch,
    resetSavedSearch,
  } = useDiscoverState({
    services,
    history,
    initialIndexPattern: props.indexPattern,
    initialSavedSearch: props.opts.savedSearch,
  });

  /**
   * Url / Routing logic
   */
  useUrl({ history, resetSavedSearch });

  /**
   * Search session logic
   */
  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  /**
   * Data fetching logic
   */
  const { data$, refetch$ } = useSavedSearchData({
    indexPattern,
    savedSearch,
    searchSessionManager,
    searchSource,
    services,
    state,
    stateContainer,
    useNewFieldsApi,
  });

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
    stateContainer.replaceUrlAppState({}).then(() => {
      stateContainer.startSync();
    });

    return () => stateContainer.stopSync();
  }, [stateContainer, chrome, docLinks]);

  const resetQuery = useCallback(() => {
    resetSavedSearch(savedSearch.id);
  }, [resetSavedSearch, savedSearch]);

  return (
    <DiscoverLayoutMemoized
      indexPattern={indexPattern}
      indexPatternList={indexPatternList}
      resetQuery={resetQuery}
      navigateTo={navigateTo}
      savedSearch={savedSearch}
      savedSearchData$={data$}
      savedSearchRefetch$={refetch$}
      searchSessionManager={searchSessionManager}
      searchSource={searchSource}
      services={services}
      state={state}
      stateContainer={stateContainer}
    />
  );
}
