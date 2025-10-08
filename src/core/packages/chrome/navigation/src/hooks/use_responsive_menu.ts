/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback, useRef, useState, useLayoutEffect } from 'react';

import type { MenuItem } from '../../types';
import { MAX_MENU_ITEMS } from '../constants';
import { getStyleProperty } from '../utils/get_style_property';

/**
 * Utility function to cache the heights of the menu items in a ref.
 * It assumes one initial render where all items are in the DOM.
 *
 * @param ref - The ref to the heights cache.
 * @param menu - The menu element.
 * @param items - The menu items.
 */
const cacheHeights = (
  ref: MutableRefObject<number[]>,
  menu: HTMLElement,
  items: MenuItem[]
): void => {
  if (ref.current?.length !== items.length) {
    const children: Element[] = Array.from(menu.children);

    // Only cache if the DOM has rendered all the items we expect
    if (children.length === items.length) {
      ref.current = children.map((child) => child.clientHeight);
    }
  }
};

/**
 * Utility function to get the number of visible menu items until we reach the menu height or the limit of menu items.
 *
 * @param heights - The heights of the menu items.
 * @param gap - The gap between the menu items.
 * @param menuHeight - The height of the menu.
 *
 * @returns The number of visible menu items.
 */
const countVisibleItems = (heights: number[], gap: number, menuHeight: number): number => {
  const countItemsToFit = (availableHeight: number, limit: number) => {
    let itemCount = 0;
    let totalHeight = 0;

    for (let i = 0; i < heights.length && itemCount < limit; i++) {
      const itemHeight = heights[i];
      const nextTotalHeight = totalHeight + itemHeight + (itemCount > 0 ? gap : 0);

      if (nextTotalHeight <= availableHeight) {
        totalHeight = nextTotalHeight;
        itemCount++;
      } else {
        break;
      }
    }

    return itemCount;
  };

  // 1. Calculate how many items can fit without considering the "More" button
  const initialVisibleCount = countItemsToFit(menuHeight, MAX_MENU_ITEMS);

  // 2. If not all items are visible, we need the "More" button
  if (heights.length > initialVisibleCount) {
    const moreItemHeight = heights[0]; // Approximately the same height as any other item
    const availableHeight = menuHeight - moreItemHeight - gap;

    return countItemsToFit(availableHeight, MAX_MENU_ITEMS - 1);
  }

  return initialVisibleCount;
};

interface ResponsiveMenuState {
  primaryMenuRef: MutableRefObject<HTMLElement | null>;
  visibleMenuItems: MenuItem[];
  overflowMenuItems: MenuItem[];
}

/**
 * Custom hook for handling responsive menu behavior with dynamic height measurement
 * @param isCollapsed - Whether the side nav is collapsed
 * @param items - Navigation items
 * @returns Object with menu ref and partitioned menu items
 */
export function useResponsiveMenu(isCollapsed: boolean, items: MenuItem[]): ResponsiveMenuState {
  const primaryMenuRef = useRef<HTMLElement | null>(null);
  const heightsCacheRef = useRef<number[]>([]);

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>(items);
  const [overflowMenuItems, setOverflowMenuItems] = useState<MenuItem[]>([]);

  const recalculateMenuLayout = useCallback(() => {
    if (!primaryMenuRef.current) return;

    // Primary menu
    const menu = primaryMenuRef.current;
    const menuHeight = menu.clientHeight;

    // 1. Cache the heights of all children
    cacheHeights(heightsCacheRef, menu, items);

    if (heightsCacheRef.current.length === 0) return;

    // Primary menu items
    const childrenHeights = heightsCacheRef.current;
    const childrenGap = getStyleProperty(menu, 'gap');

    // 2. Calculate the number of visible menu items
    const visibleCount = countVisibleItems(childrenHeights, childrenGap, menuHeight);

    // 3. Update the visible and overflow menu items
    setVisibleMenuItems(items.slice(0, visibleCount));
    setOverflowMenuItems(items.slice(visibleCount));
  }, [items]);

  useLayoutEffect(() => {
    setVisibleMenuItems(items);
    setOverflowMenuItems([]);

    // Invalidate the cache when items change
    heightsCacheRef.current = [];

    const observer = new ResizeObserver(recalculateMenuLayout);

    if (primaryMenuRef.current) {
      observer.observe(primaryMenuRef.current);
    }

    return () => observer.disconnect();
  }, [isCollapsed, items, recalculateMenuLayout]);

  useLayoutEffect(() => {
    recalculateMenuLayout();
  }, [isCollapsed, recalculateMenuLayout]);

  return {
    primaryMenuRef,
    visibleMenuItems,
    overflowMenuItems,
  };
}
