/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DiscoverStateContainer } from './services/discover_state';
import { DiscoverLayout } from './components/layout';
import { setBreadcrumbsTitle } from '../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverState } from './hooks/use_discover_state';
import { useUrl } from './hooks/use_url';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DataTableRecord } from '../../types';
import { useSavedSearchAliasMatchRedirect } from '../../hooks/saved_search_alias_match_redirect';
import { DiscoverMainProvider } from './services/discover_state_provider';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  /**
   * Central state container
   */
  stateContainer: DiscoverStateContainer;
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { stateContainer } = props;
  const savedSearch = stateContainer.savedSearchState.get();
  const services = useDiscoverServices();
  const { chrome, docLinks, data, spaces, history } = services;
  const usedHistory = useHistory();
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>(undefined);
  const navigateTo = useCallback(
    (path: string) => {
      usedHistory.push(path);
    },
    [usedHistory]
  );

  /**
   * State related logic
   */
  const {
    inspectorAdapters,
    onChangeDataView,
    onUpdateQuery,
    persistDataView,
    searchSessionManager,
    updateDataViewList,
  } = useDiscoverState({
    services,
    stateContainer,
    setExpandedDoc,
  });

  /**
   * Url / Routing logic
   */
  useUrl({ history: usedHistory, stateContainer });

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
  }, [savedSearch, chrome, data]);

  /**
   * Initializing syncing with state and help menu
   */
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [stateContainer, chrome, docLinks]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <DiscoverMainProvider value={stateContainer}>
      <DiscoverLayoutMemoized
        inspectorAdapters={inspectorAdapters}
        expandedDoc={expandedDoc}
        onChangeDataView={onChangeDataView}
        onUpdateQuery={onUpdateQuery}
        setExpandedDoc={setExpandedDoc}
        navigateTo={navigateTo}
        stateContainer={stateContainer}
        persistDataView={persistDataView}
        searchSessionManager={searchSessionManager}
        updateDataViewList={updateDataViewList}
      />
    </DiscoverMainProvider>
  );
}
