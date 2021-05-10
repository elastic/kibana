/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { History } from 'history';
import { Discover } from './discover';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../common';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import { setBreadcrumbsTitle } from '../helpers/breadcrumbs';
import { addHelpMenuToAppChrome } from './help_menu/help_menu_util';
import { useDiscoverState } from './use_discover_state';
import { useSearchSession } from './use_search_session';
import { IndexPattern, IndexPatternAttributes, SavedObject } from '../../../../data/common';
import { DiscoverServices } from '../../build_services';
import { SavedSearch } from '../../saved_searches';

const DiscoverMemoized = React.memo(Discover);

export interface DiscoverWrapperProps {
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

export function DiscoverWrapper(props: DiscoverWrapperProps) {
  const { services, history, navigateTo, indexPatternList } = props.opts;
  const { chrome, docLinks, uiSettings: config, data } = services;

  const useNewFieldsApi = useMemo(() => !services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [
    services,
  ]);

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
  useEffect(() => {
    // this listener is waiting for such a path http://localhost:5601/app/discover#/
    // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
    // to reload the page in a right way
    const unlistenHistoryBasePath = history.listen(({ pathname, search, hash }) => {
      if (!search && !hash && pathname === '/') {
        resetSavedSearch('');
      }
    });
    return () => unlistenHistoryBasePath();
  }, [history, resetSavedSearch]);

  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  /**
   * Data fetching logic
   */

  const { refetch$, chart$, hits$, shouldSearchOnPageLoad, savedSearch$ } = useSavedSearchData({
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
   * Initializing saved search
   */

  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);
    setBreadcrumbsTitle(savedSearch, chrome);

    if (shouldSearchOnPageLoad()) {
      refetch$.next();
    }
    return () => {
      data.search.session.clear();
    };
  }, [
    savedSearch,
    chrome,
    docLinks,
    refetch$,
    shouldSearchOnPageLoad,
    stateContainer,
    data,
    config,
  ]);

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
    <DiscoverMemoized
      chart$={chart$}
      hits$={hits$}
      indexPattern={indexPattern}
      indexPatternList={indexPatternList}
      refetch$={refetch$}
      resetQuery={resetQuery}
      navigateTo={navigateTo}
      savedSearch={savedSearch}
      savedSearch$={savedSearch$}
      searchSessionManager={searchSessionManager}
      searchSource={searchSource}
      services={services}
      state={state}
      stateContainer={stateContainer}
    />
  );
}
