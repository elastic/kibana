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
import { Provider } from './services/discover_state';
import { useUrl } from './hooks/use_url';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DataTableRecord } from '../../types';
import { useSavedSearchAliasMatchRedirect } from '../../hooks/saved_search_alias_match_redirect';

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
    data$,
    dataView,
    inspectorAdapters,
    onChangeDataView,
    stateContainer,
    persistDataView,
    updateAdHocDataViewId,
    adHocDataViewList,
  } = useDiscoverState({
    services,
    history: usedHistory,
    savedSearch,
    setExpandedDoc,
    dataViewList,
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
  }, [chrome, docLinks]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <Provider value={stateContainer.appStateContainer}>
      <DiscoverLayoutMemoized
        dataView={dataView}
        dataViewList={dataViewList}
        inspectorAdapters={inspectorAdapters}
        expandedDoc={expandedDoc}
        onChangeDataView={onChangeDataView}
        setExpandedDoc={setExpandedDoc}
        navigateTo={navigateTo}
        savedSearchData$={data$}
        stateContainer={stateContainer}
        persistDataView={persistDataView}
        updateAdHocDataViewId={updateAdHocDataViewId}
        adHocDataViewList={adHocDataViewList}
      />
    </Provider>
  );
}
