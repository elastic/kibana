/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { DiscoverLayout } from './components/layout';
import { setBreadcrumbsTitle } from '../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverState } from './hooks/use_discover_state';
import { DiscoverStateContainer, useSavedSearchPersisted } from './services/discover_state';
import { useUrl } from './hooks/use_url';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { DataTableRecord } from '../../types';
import { useSavedSearchAliasMatchRedirect } from '../../hooks/saved_search_alias_match_redirect';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  stateContainer: DiscoverStateContainer;
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { stateContainer } = props;
  const savedSearch = useSavedSearchPersisted();
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
  const { persistDataView, updateAdHocDataViewId, adHocDataViewList } = useDiscoverState({
    services,
    setExpandedDoc,
    stateContainer,
  });

  /**
   * Url / Routing logic
   */
  useUrl({ history: usedHistory, stateContainer });

  /**
   * SavedSearch dependent initializing
   */
  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);
    setBreadcrumbsTitle(savedSearch.title, chrome);
    return () => {
      data.search.session.clear();
    };
  }, [savedSearch.id, savedSearch.title, chrome, data]);

  /**
   * Initializing syncing with state and help menu
   */
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [chrome, docLinks]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <DiscoverLayoutMemoized
      expandedDoc={expandedDoc}
      setExpandedDoc={setExpandedDoc}
      navigateTo={navigateTo}
      stateContainer={stateContainer}
      persistDataView={persistDataView}
      updateAdHocDataViewId={updateAdHocDataViewId}
      adHocDataViewList={adHocDataViewList}
    />
  );
}
