/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { DataViewAttributes } from '@kbn/data-views-plugin/public';
import type { SavedObject } from '@kbn/data-plugin/public';
import { LogExplorerLayout } from './log_explorer_layout';
import { setBreadcrumbsTitle } from '../../../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../../../components/help_menu/help_menu_util';
import { useDiscoverState } from '../../hooks/use_discover_state';
import { useUrl } from '../../hooks/use_url';
import { SavedSearch, useSavedSearchAliasMatchRedirect } from '../../../../services/saved_searches';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataTableRecord } from '../../../../types';

const LogExplorerLayoutMemoized = React.memo(LogExplorerLayout);

export interface DiscoverMainProps {
  /**
   * List of available index patterns
   */
  indexPatternList: Array<SavedObject<DataViewAttributes>>;
  /**
   * Current instance of SavedSearch
   */
  savedSearch: SavedSearch;
}

export function LogExplorerMainApp(props: DiscoverMainProps) {
  const { savedSearch, indexPatternList } = props;
  const services = useDiscoverServices();
  const { chrome, docLinks, uiSettings: config, data, spaces, history } = services;
  const usedHistory = useHistory();
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const navigateTo = useCallback(
    (path: string) => {
      usedHistory.push(path);
    },
    [usedHistory]
  );

  // TODO: We will want to rewrite the bulk of the query fetching logic in useDiscoverState > useSavedSearch (which returns data$)
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
    history: usedHistory,
    savedSearch,
    setExpandedDoc,
  });

  /**
   * Url / Routing logic
   */
  useUrl({ history: usedHistory, resetSavedSearch });

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

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <LogExplorerLayoutMemoized
      indexPattern={indexPattern}
      indexPatternList={indexPatternList}
      inspectorAdapters={inspectorAdapters}
      expandedDoc={expandedDoc}
      onChangeIndexPattern={onChangeIndexPattern}
      onUpdateQuery={onUpdateQuery}
      resetSavedSearch={resetCurrentSavedSearch}
      setExpandedDoc={setExpandedDoc}
      navigateTo={navigateTo}
      savedSearch={savedSearch}
      savedSearchData$={data$}
      savedSearchRefetch$={refetch$}
      searchSource={searchSource}
      state={state}
      stateContainer={stateContainer}
    />
  );
}
