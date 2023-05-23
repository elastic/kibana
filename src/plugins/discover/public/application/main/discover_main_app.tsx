/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useEffect } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { useHistory } from 'react-router-dom';
import { useUrlTracking } from './hooks/use_url_tracking';
import { DiscoverStateContainer } from './services/discover_state';
import { DiscoverLayout } from './components/layout';
import { setBreadcrumbsTitle } from '../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useSavedSearchAliasMatchRedirect } from '../../hooks/saved_search_alias_match_redirect';
import { useSavedSearchInitial } from './services/discover_state_provider';
import { useAdHocDataViews } from './hooks/use_adhoc_data_views';
import { useTextBasedQueryLanguage } from './hooks/use_text_based_query_language';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  /**
   * Central state container
   */
  stateContainer: DiscoverStateContainer;
}

export function DiscoverMainApp(props: DiscoverMainProps) {
  const { stateContainer } = props;
  const savedSearch = useSavedSearchInitial();
  const services = useDiscoverServices();
  const { chrome, docLinks, data, spaces, history } = services;
  const usedHistory = useHistory();
  const navigateTo = useCallback(
    (path: string) => {
      usedHistory.push(path);
    },
    [usedHistory]
  );

  useUrlTracking(stateContainer.savedSearchState);

  /**
   * Adhoc data views functionality
   */
  useAdHocDataViews({ stateContainer, services });

  /**
   * State changes (data view, columns), when a text base query result is returned
   */
  useTextBasedQueryLanguage({
    dataViews: services.dataViews,
    stateContainer,
  });
  /**
   * Start state syncing and fetch data if necessary
   */
  useEffect(() => {
    const unsubscribe = stateContainer.actions.initializeAndSync();
    stateContainer.actions.fetchData(true);
    return () => unsubscribe();
  }, [stateContainer]);

  /**
   * SavedSearch dependend initializing
   */
  useEffect(() => {
    const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
    chrome.docTitle.change(`Discover${pageTitleSuffix}`);
    setBreadcrumbsTitle(savedSearch.title, chrome);
  }, [savedSearch.id, savedSearch.title, chrome, data]);

  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [chrome, docLinks]);

  useEffect(() => {
    return () => {
      // clear session when navigating away from discover main
      data.search.session.clear();
    };
  }, [data.search.session]);

  useSavedSearchAliasMatchRedirect({ savedSearch, spaces, history });

  return (
    <RootDragDropProvider>
      <DiscoverLayoutMemoized navigateTo={navigateTo} stateContainer={stateContainer} />
    </RootDragDropProvider>
  );
}
