/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useState, RefObject, useLayoutEffect } from 'react';

import { MenuItem, NavigationStructure } from '../../types';

/**
 * The larger height of the primary menu item when the label is 2 lines
 */
const EXPANDED_MENU_ITEM_HEIGHT = 67;
const COLLAPSED_MENU_ITEM_HEIGHT = 32;
const MAX_MENU_ITEMS = 9;

interface ResponsiveMenuState {
  primaryMenuRef: RefObject<HTMLElement>;
  visibleMenuItems: MenuItem[];
  overflowMenuItems: MenuItem[];
}

interface MenuCalculations {
  availableHeight: number;
  itemGap: number;
  maxVisibleItems: number;
}

/**
 * Measures the actual height of menu items by querying existing DOM elements
 */
const getActualItemHeights = (menuElement: HTMLElement): number[] => {
  const menuItems = menuElement.querySelectorAll('[data-menu-item]');
  const heights: number[] = [];

  menuItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    heights.push(rect.height);
  });

  return heights;
};

/**
 * Calculates how many menu items can fit using cumulative height calculation
 */
const calculateVisibleItemCount = (
  calculations: MenuCalculations,
  actualItemHeights: number[]
): number => {
  const { availableHeight, itemGap, maxVisibleItems } = calculations;

  let cumulativeHeight = 0;
  let visibleCount = 0;

  for (let i = 0; i < Math.min(actualItemHeights.length, maxVisibleItems); i++) {
    const itemHeight = actualItemHeights[i] || EXPANDED_MENU_ITEM_HEIGHT; // fallback to maximum expanded height
    const heightWithGap = itemHeight + (i > 0 ? itemGap : 0);

    if (cumulativeHeight + heightWithGap <= availableHeight) {
      cumulativeHeight += heightWithGap;
      visibleCount++;
    } else {
      break;
    }
  }

  return visibleCount;
};

/**
 * Splits menu items into `visible` and `overflow` based on available space
 */
const partitionMenuItems = (
  allItems: MenuItem[],
  maxVisibleCount: number
): { visible: MenuItem[]; overflow: MenuItem[] } => {
  if (maxVisibleCount >= allItems.length) {
    return { visible: allItems, overflow: [] };
  }

  // Reserve one slot for "More" button when we have overflow
  const visibleCount = Math.max(0, maxVisibleCount - 1);

  return {
    visible: allItems.slice(0, visibleCount),
    overflow: allItems.slice(visibleCount),
  };
};

/**
 * Custom hook for handling responsive menu behavior with dynamic height measurement
 * @param isCollapsed - Whether the side nav is collapsed
 * @param items - Navigation items
 * @returns Object with menu ref and partitioned menu items
 */
export function useResponsiveMenu(
  isCollapsed: boolean,
  items: NavigationStructure
): ResponsiveMenuState {
  const primaryMenuRef = useRef<HTMLElement>(null);

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);
  const [overflowMenuItems, setOverflowMenuItems] = useState<MenuItem[]>([]);

  const recalculateMenuLayout = useCallback(() => {
    const menuElement = primaryMenuRef.current;
    if (!menuElement) {
      return;
    }

    const menuRect = menuElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(menuElement);
    const itemGap = parseFloat(computedStyle.getPropertyValue('gap')) || 0;
    const renderedItemHeights = getActualItemHeights(menuElement);

    const actualItemHeights: number[] = [];

    for (let i = 0; i < items.primaryItems.length; i++) {
      if (i < renderedItemHeights.length) {
        actualItemHeights.push(renderedItemHeights[i]);
      } else {
        const avgHeight =
          renderedItemHeights.length > 0
            ? renderedItemHeights.reduce((sum, h) => sum + h, 0) / renderedItemHeights.length
            : isCollapsed
            ? COLLAPSED_MENU_ITEM_HEIGHT
            : EXPANDED_MENU_ITEM_HEIGHT;
        actualItemHeights.push(avgHeight);
      }
    }

    const calculations: MenuCalculations = {
      availableHeight: menuRect.height,
      itemGap,
      maxVisibleItems: MAX_MENU_ITEMS,
    };

    const maxVisibleItems = calculateVisibleItemCount(calculations, actualItemHeights);

    // if we need overflow (more total items than can fit), we need to account for "More" button space
    let adjustedMaxVisible = maxVisibleItems;
    if (items.primaryItems.length > maxVisibleItems) {
      const moreButtonHeight = actualItemHeights[0] || EXPANDED_MENU_ITEM_HEIGHT;
      const availableForRegularItems = calculations.availableHeight - moreButtonHeight;

      const adjustedCalculations = {
        ...calculations,
        availableHeight: availableForRegularItems,
      };
      adjustedMaxVisible = calculateVisibleItemCount(adjustedCalculations, actualItemHeights);
    }

    const { visible, overflow } = partitionMenuItems(items.primaryItems, adjustedMaxVisible);

    setVisibleMenuItems(visible);
    setOverflowMenuItems(overflow);
  }, [isCollapsed, items]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(recalculateMenuLayout);

    if (primaryMenuRef.current) {
      observer.observe(primaryMenuRef.current);
    }

    recalculateMenuLayout();

    return () => observer.disconnect();
  }, [recalculateMenuLayout]);

  return {
    primaryMenuRef,
    visibleMenuItems,
    overflowMenuItems,
  };
}
