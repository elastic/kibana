/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { useUrlTracking } from './hooks/use_url_tracking';
import { DiscoverStateContainer } from './state_management/discover_state';
import { DiscoverLayout } from './components/layout';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { addHelpMenuToAppChrome } from '../../components/help_menu/help_menu_util';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useSavedSearchAliasMatchRedirect } from '../../hooks/saved_search_alias_match_redirect';
import { useSavedSearchInitial } from './state_management/discover_state_provider';
import { useAdHocDataViews } from './hooks/use_adhoc_data_views';
import { useEsqlMode } from './hooks/use_esql_mode';
import { addLog } from '../../utils/add_log';

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

  useUrlTracking(stateContainer);

  /**
   * Adhoc data views functionality
   */
  useAdHocDataViews({ stateContainer, services });

  /**
   * State changes (data view, columns), when a text base query result is returned
   */
  useEsqlMode({
    dataViews: services.dataViews,
    stateContainer,
  });

  /**
   * Start state syncing and fetch data if necessary
   */
  useEffect(() => {
    const unsubscribe = stateContainer.actions.initializeAndSync();
    addLog('[DiscoverMainApp] state container initialization triggers data fetching');
    stateContainer.actions.fetchData(true);
    return () => unsubscribe();
  }, [stateContainer]);

  /**
   * SavedSearch dependent initializing
   */
  useEffect(() => {
    if (stateContainer.customizationContext.displayMode === 'standalone') {
      const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
      chrome.docTitle.change(`Discover${pageTitleSuffix}`);
      setBreadcrumbs({ titleBreadcrumbText: savedSearch.title, services });
    }
  }, [
    chrome.docTitle,
    savedSearch.id,
    savedSearch.title,
    services,
    stateContainer.customizationContext.displayMode,
  ]);

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
      <DiscoverLayoutMemoized stateContainer={stateContainer} />
    </RootDragDropProvider>
  );
}
