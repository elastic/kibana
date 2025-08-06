/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';

import { MenuItem, SecondaryMenuItem } from '../../types';
import { InitialMenuState } from '../utils/get_initial_active_items';

interface UseNavigationProps {
  initialActiveItems: InitialMenuState;
  isCollapsed: boolean;
}

interface NavigationState {
  currentPageId: string | undefined;
  currentSubpageId: string | undefined;
  sidePanelContent: MenuItem | null;
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
}

export const useNavigation = ({
  initialActiveItems: { primaryItem, secondaryItem },
  isCollapsed,
}: UseNavigationProps) => {
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(primaryItem?.id);
  const [currentSubpageId, setCurrentSubpageId] = useState<string | undefined>(secondaryItem?.id);
  const [sidePanelContent, setSidePanelContent] = useState<MenuItem | null>(primaryItem);

  // Determine if side panel should be open based on simple logic
  const isSidePanelOpen = !isCollapsed && !!sidePanelContent?.sections;

  // Check if a menu item is currently active
  const isMenuItemActive = useCallback(
    (item: MenuItem | SecondaryMenuItem): boolean => {
      if ('id' in item) {
        return item.id === currentPageId || item.id === currentSubpageId;
      }
      return false;
    },
    [currentPageId, currentSubpageId]
  );

  // Navigate to a menu item
  const navigateTo = useCallback(
    (primaryMenuItem: MenuItem, secondaryMenuItem?: SecondaryMenuItem) => {
      setCurrentPageId(primaryMenuItem.id);
      setCurrentSubpageId(secondaryMenuItem?.id || undefined);
      setSidePanelContent(primaryMenuItem);
    },
    []
  );

  const state: NavigationState = {
    currentPageId,
    currentSubpageId,
    sidePanelContent,
    isCollapsed,
    isSidePanelOpen,
  };

  return {
    ...state,
    navigateTo,
    isMenuItemActive,
  };
};
