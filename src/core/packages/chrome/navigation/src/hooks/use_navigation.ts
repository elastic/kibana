/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback, useEffect } from 'react';

import type { MenuItem, NavigationStructure, SecondaryMenuItem } from '../../types';
import type { InitialMenuState } from '../utils/get_initial_active_items';
import { getInitialActiveItems } from '../utils/get_initial_active_items';

interface NavigationState {
  activePageId: string | undefined;
  activeSubpageId: string | undefined;
  sidePanelContent: MenuItem | null;
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
}

export const useNavigation = (
  isCollapsed: boolean,
  items: NavigationStructure,
  logoId: string,
  activeItemId?: string
) => {
  const { primaryItem, secondaryItem, isLogoActive } = getInitialActiveItems(
    items,
    activeItemId,
    logoId
  );

  const [activePageId, setActivePageId] = useState<string | undefined>(
    isLogoActive ? logoId : primaryItem?.id
  );
  const [activeSubpageId, setActiveSubpageId] = useState<string | undefined>(secondaryItem?.id);
  const [sidePanelContent, setSidePanelContent] = useState<MenuItem | null>(primaryItem);

  const isSidePanelOpen = !isCollapsed && !!sidePanelContent?.sections;

  const navigateTo = useCallback(
    (primaryMenuItem: MenuItem, secondaryMenuItem?: SecondaryMenuItem) => {
      setActivePageId(primaryMenuItem.id);
      setActiveSubpageId(secondaryMenuItem?.id || undefined);
      setSidePanelContent(primaryMenuItem);
    },
    []
  );

  const resetActiveItems = useCallback(
    (newActiveItems: InitialMenuState) => {
      const {
        primaryItem: newPrimaryItem,
        secondaryItem: newSecondaryItem,
        isLogoActive: newIsLogoActive,
      } = newActiveItems;
      setActivePageId(newIsLogoActive ? logoId : newPrimaryItem?.id);
      setActiveSubpageId(newSecondaryItem?.id);
      setSidePanelContent(newPrimaryItem);
    },
    [logoId]
  );

  // Update active items when `activeItemId` changes
  useEffect(() => {
    const newActiveItems = getInitialActiveItems(items, activeItemId, logoId);
    resetActiveItems(newActiveItems);
  }, [activeItemId, items, logoId, resetActiveItems]);

  const state: NavigationState = {
    activePageId,
    activeSubpageId,
    sidePanelContent,
    isCollapsed,
    isSidePanelOpen,
  };

  return {
    ...state,
    navigateTo,
  };
};
