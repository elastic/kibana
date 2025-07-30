/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';
import { IMenuItem, ISecondaryMenuItem } from '../../types';

interface UseNavigationProps {
  initialMenuItem: IMenuItem;
  isCollapsed: boolean;
}

interface NavigationState {
  currentPage: string | undefined;
  currentSubpage: string | null;
  sidePanelContent: IMenuItem | null;
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
}

export const useNavigation = ({ initialMenuItem, isCollapsed }: UseNavigationProps) => {
  const [currentPage, setCurrentPage] = useState(initialMenuItem.href);
  const [currentSubpage, setCurrentSubpage] = useState<string | null>(null);
  const [sidePanelContent, setSidePanelContent] = useState<IMenuItem | null>(initialMenuItem);

  // Determine if side panel should be open based on simple logic
  const isSidePanelOpen = !isCollapsed && !!sidePanelContent?.sections;

  // Check if a menu item is currently active
  const isMenuItemActive = useCallback(
    (item: IMenuItem | ISecondaryMenuItem): boolean => {
      if ('href' in item && item.href) {
        return item.href === currentPage || item.href === currentSubpage;
      }
      return false;
    },
    [currentPage, currentSubpage]
  );

  // Navigate to a menu item
  const navigateTo = useCallback(
    (primaryMenuItem: IMenuItem, secondaryMenuItem?: ISecondaryMenuItem) => {
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
