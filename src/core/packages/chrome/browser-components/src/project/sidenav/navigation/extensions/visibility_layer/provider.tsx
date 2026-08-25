/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useSyncExternalStore } from 'react';
import type { SolutionId } from '@kbn/core-chrome-browser';
import type { NavigationItems } from '../../to_navigation_items';
import { applyExtensionVisibility } from '../utils';
import { ExtensionVisibilityContext } from './context';
import { ExtensionVisibilityController } from './controller';
import { createExtensionVisibilityStore } from './store';

interface ExtensionVisibilityProviderProps extends NavigationItems {
  solutionId: SolutionId;
  children: (
    args: Omit<ExtensionVisibilityProviderProps, 'children' | 'hideWhenEmptyExtensionIds'>
  ) => React.ReactElement;
}

/**
 * Utility component that filters the navigation tree items based on the extension visibility.
 * Allowing for an experience where extensions can be hidden from the navigation tree
 * till they actually have data to show.
 */
export const ExtensionVisibilityProvider = ({
  navItems,
  logoItem,
  activeItemId,
  solutionId,
  children,
  hideWhenEmptyExtensionIds,
}: ExtensionVisibilityProviderProps) => {
  const store = useMemo(() => createExtensionVisibilityStore(), []);

  const visibilityRevision = useSyncExternalStore(
    store.subscribeTree,
    () => store.visibilityRevision,
    () => store.visibilityRevision
  );

  const visibleState = useMemo(() => {
    const visibleItems = applyExtensionVisibility(
      { navItems, logoItem, activeItemId, hideWhenEmptyExtensionIds },
      store,
      visibilityRevision
    );

    return {
      navItems: visibleItems.navItems,
      logoItem: visibleItems.logoItem,
      activeItemId: visibleItems.activeItemId,
      solutionId,
    };
  }, [
    navItems,
    logoItem,
    activeItemId,
    solutionId,
    store,
    visibilityRevision,
    hideWhenEmptyExtensionIds,
  ]);

  return (
    <ExtensionVisibilityContext.Provider value={store}>
      <ExtensionVisibilityController
        baseItems={{ navItems, logoItem, activeItemId, hideWhenEmptyExtensionIds }}
      />
      {children(visibleState)}
    </ExtensionVisibilityContext.Provider>
  );
};
