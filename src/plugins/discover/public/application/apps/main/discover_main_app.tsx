/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { History } from 'history';
import React, { useCallback, useEffect } from 'react';
import type { SavedObject } from '../../../../../../core/types/saved_objects';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns/index_pattern';
import type { IndexPatternAttributes } from '../../../../../data/common/index_patterns/types';
import type { DiscoverServices } from '../../../build_services';
import type { SavedSearch } from '../../../saved_searches/types';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { setBreadcrumbsTitle } from '../../helpers/breadcrumbs';
import { DiscoverLayout } from './components/layout/discover_layout';
import { useDiscoverState } from './services/use_discover_state';
import { useUrl } from './services/use_url';

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
    savedSearch,
    searchSource,
    state,
    stateContainer,
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

  const resetQuery = useCallback(() => {
    resetSavedSearch(savedSearch.id);
  }, [resetSavedSearch, savedSearch]);

  return (
    <DiscoverLayoutMemoized
      indexPattern={indexPattern}
      indexPatternList={indexPatternList}
      inspectorAdapters={inspectorAdapters}
      onChangeIndexPattern={onChangeIndexPattern}
      onUpdateQuery={onUpdateQuery}
      resetQuery={resetQuery}
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
