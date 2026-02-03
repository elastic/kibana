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
import { useInternalStateSelector } from '../../state_management/redux';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { DiscoverLayout } from '../layout';
import { addHelpMenuToAppChrome } from '../../../../components/help_menu/help_menu_util';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useSavedSearchAliasMatchRedirect } from '../../../../hooks/saved_search_alias_match_redirect';
import { useAdHocDataViews } from '../../hooks/use_adhoc_data_views';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  /**
   * Central state container
   */
  stateContainer: DiscoverStateContainer;
}

export function DiscoverMainApp({ stateContainer }: DiscoverMainProps) {
  const services = useDiscoverServices();
  const discoverSession = useInternalStateSelector((state) => state.persistedDiscoverSession);
  const { chrome, docLinks, spaces, history } = services;

  /**
   * Adhoc data views functionality
   */
  useAdHocDataViews();

  // TODO: Move this higher up in the component tree
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [chrome, docLinks]);

  // TODO: Move this higher up in the component tree
  useSavedSearchAliasMatchRedirect({ discoverSession, spaces, history });

  return (
    <RootDragDropProvider>
      <DiscoverLayoutMemoized stateContainer={stateContainer} />
    </RootDragDropProvider>
  );
}
