/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useCallback, useEffect } from 'react';
import { DiscoverProps } from './types';
import { Discover } from './discover';
import { SEARCH_FIELDS_FROM_SOURCE, SEARCH_ON_PAGE_LOAD_SETTING } from '../../../common';
import { useSavedSearch as useSavedSearchData } from './use_saved_search';
import { setBreadcrumbsTitle } from '../helpers/breadcrumbs';
import { addHelpMenuToAppChrome } from './help_menu/help_menu_util';
import { useDiscoverState } from './use_discover_state';
import { useSearchSession } from './use_search_session';

const DiscoverMemoized = React.memo(Discover);

export function DiscoverWrapper(props: DiscoverProps) {
  const { services } = props.opts;
  const { chrome, docLinks, uiSettings: config } = services;

  const history = useMemo(() => services.history(), [services]);

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
        resetSavedSearch();
      }
    });
    return () => unlistenHistoryBasePath();
  }, [history, resetSavedSearch]);

  const searchSessionManager = useSearchSession({ services, history, stateContainer, savedSearch });

  /**
   * Data fetching logic
   */
  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      config.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      services.timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [config, savedSearch.id, searchSessionManager, services.timefilter]);

  const useSavedSearch = useSavedSearchData({
    indexPattern,
    savedSearch,
    searchSessionManager,
    searchSource,
    services,
    state,
    stateContainer,
    useNewFieldsApi,
    shouldSearchOnPageLoad,
  });

  /**
   * Initializing
   */
  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);

    setBreadcrumbsTitle(savedSearch, chrome);
    addHelpMenuToAppChrome(chrome, docLinks);
    // Propagate current app state to url, then start syncing and fetching
    stateContainer.replaceUrlAppState({}).then(() => {
      stateContainer.startSync();
      if (shouldSearchOnPageLoad()) {
        useSavedSearch.refetch$.next();
      }
    });
  }, [
    savedSearch,
    chrome,
    docLinks,
    useSavedSearch.refetch$,
    services,
    shouldSearchOnPageLoad,
    stateContainer,
  ]);

  return (
    <DiscoverMemoized
      {...props}
      indexPattern={indexPattern}
      state={state}
      stateContainer={stateContainer}
      searchSessionManager={searchSessionManager}
      useSavedSearch={useSavedSearch}
      searchSource={searchSource}
    />
  );
}
