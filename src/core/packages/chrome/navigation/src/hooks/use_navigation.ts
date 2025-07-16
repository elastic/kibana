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

interface UseNavigationProps {
  initialMenuItem: MenuItem;
  isCollapsed: boolean;
}

interface NavigationState {
  currentPage: string;
  currentSubpage: string | null;
  sidePanelContent: MenuItem | null;
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
}

export const useNavigation = ({ initialMenuItem, isCollapsed }: UseNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(initialMenuItem.href);
  const [currentSubpage, setCurrentSubpage] = useState<string | null>(null);
  const [sidePanelContent, setSidePanelContent] = useState<MenuItem | null>(initialMenuItem);

  // Determine if side panel should be open based on simple logic
  const isSidePanelOpen = !isCollapsed && !!sidePanelContent?.sections;

  // Check if a menu item is currently active
  const isMenuItemActive = useCallback(
    (item: MenuItem | SecondaryMenuItem): boolean => {
      if ('href' in item && item.href) {
        return item.href === currentPage || item.href === currentSubpage;
      }
      return false;
    },
    [currentPage, currentSubpage]
  );

  // Navigate to a menu item
  const navigateTo = useCallback(
    (primaryMenuItem: MenuItem, secondaryMenuItem?: SecondaryMenuItem) => {
      setCurrentPage(primaryMenuItem.href);
      setCurrentSubpage(secondaryMenuItem?.href || null);
      setSidePanelContent(primaryMenuItem);
    },
    []
  );

  const state: NavigationState = {
    currentPage,
    currentSubpage,
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
