/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
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
   * List of available data views
   */
  dataViewList: DataViewListItem[];
  /**
   * Current instance of SavedSearch
   */
  savedSearch: SavedSearch;
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { savedSearch, dataViewList } = props;
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
    updateAdHocDataViewId,
    resetSavedSearch,
    searchSource,
    stateContainer,
    updateDataViewList,
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
  }, [savedSearch, chrome, data]);

  /**
   * Initializing syncing with state and help menu
   */
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [stateContainer, chrome, docLinks]);

  /**
   * Set initial data view list
   * Can be removed once the state container work was completed
   */
  useEffect(() => {
    stateContainer.internalState.transitions.setSavedDataViews(dataViewList);
  }, [stateContainer, dataViewList]);

  const resetCurrentSavedSearch = useCallback(() => {
    resetSavedSearch(savedSearch.id);
  }, [resetSavedSearch, savedSearch]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <DiscoverMainProvider value={stateContainer}>
      <DiscoverLayoutMemoized
        inspectorAdapters={inspectorAdapters}
        expandedDoc={expandedDoc}
        onChangeDataView={onChangeDataView}
        onUpdateQuery={onUpdateQuery}
        resetSavedSearch={resetCurrentSavedSearch}
        setExpandedDoc={setExpandedDoc}
        navigateTo={navigateTo}
        savedSearch={savedSearch}
        searchSource={searchSource}
        stateContainer={stateContainer}
        persistDataView={persistDataView}
        updateAdHocDataViewId={updateAdHocDataViewId}
        updateDataViewList={updateDataViewList}
      />
    </DiscoverMainProvider>
  );
}
