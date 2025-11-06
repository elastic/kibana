/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback, useRef, useState, useLayoutEffect, useMemo } from 'react';

import type { MenuItem } from '../../types';
import { MAX_MENU_ITEMS } from '../constants';
import { getStyleProperty } from '../utils/get_style_property';
import { useRafDebouncedCallback } from './use_raf_debounced';

interface ResponsiveMenuState {
  primaryMenuRef: MutableRefObject<HTMLElement | null>;
  visibleMenuItems: MenuItem[];
  overflowMenuItems: MenuItem[];
}

/**
 * Custom hook that measures the primary nav container and decides which items can stay visible.
 * Items that no longer fit are moved into the overflow "More" menu so the sidebar keeps its size
 * limits when resizing, zooming, or collapsing.
 *
 * @param isCollapsed - whether the side nav is currently collapsed (affects layout recalculation).
 * @param items - all primary navigation items, in priority order.
 * @returns an object containing:
 * - `primaryMenuRef` - a ref to the primary menu.
 * - `visibleMenuItems` - the visible menu items.
 * - `overflowMenuItems` - the overflow menu items.
 */
export function useResponsiveMenu(isCollapsed: boolean, items: MenuItem[]): ResponsiveMenuState {
  const primaryMenuRef = useRef<HTMLElement | null>(null);
  const heightsCacheRef = useRef<number[]>([]);

  const [visibleCount, setVisibleCount] = useState<number>(items.length);

  const visibleMenuItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const overflowMenuItems = useMemo(() => items.slice(visibleCount), [items, visibleCount]);
  const stableItemsReference = useStableItemsReference(items);

  const recalculateMenuLayout = useCallback(() => {
    if (!primaryMenuRef.current) return;

    // Primary menu
    const menu = primaryMenuRef.current;
    const menuHeight = menu.clientHeight;

    // 1. Cache the heights of all children
    cacheHeights(heightsCacheRef, menu, stableItemsReference);

    if (heightsCacheRef.current.length === 0) return;

    // Primary menu items
    const childrenHeights = heightsCacheRef.current;
    const childrenGap = getStyleProperty(menu, 'gap');

    // 2. Calculate the number of visible menu items
    const nextVisibleCount = countVisibleItems(childrenHeights, childrenGap, menuHeight);

    // 3. Update the visible count if needed
    setVisibleCount(nextVisibleCount);
  }, [stableItemsReference]);

  const [scheduleRecalc, cancelRecalc] = useRafDebouncedCallback(recalculateMenuLayout);

  useLayoutEffect(() => {
    // Invalidate the cache when items change
    setVisibleCount(stableItemsReference.length);
    heightsCacheRef.current = [];

    const observer = new ResizeObserver(() => {
      scheduleRecalc();
    });

    if (primaryMenuRef.current) {
      observer.observe(primaryMenuRef.current);
    }

    // Initial calculation
    scheduleRecalc();

    return () => {
      observer.disconnect();
      cancelRecalc();
    };
  }, [isCollapsed, stableItemsReference, scheduleRecalc, cancelRecalc]);

  return {
    primaryMenuRef,
    visibleMenuItems,
    overflowMenuItems,
  };
}

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

/**
 * Get a stable reference to the items array that changes only when we need to recalculate the height.
 *
 * @param items - menu items.
 * @returns the stable items reference.
 */
const useStableItemsReference = (items: MenuItem[]): MenuItem[] => {
  const ref = useRef<MenuItem[]>(items);
  const out = haveSameHeightSignature(ref.current, items) ? ref.current : items;

  // Don’t write to a ref during render
  useLayoutEffect(() => {
    if (!haveSameHeightSignature(ref.current, items)) {
      ref.current = items;
    }
  }, [items]);

  return out;
};

/**
 * Pre-check to see if the item's height might have changed and if we need to do a full recalculation.
 *
 * @param prev - previous menu items.
 * @param next - next menu items.
 * @returns (boolean) whether the menu items have the same height signature.
 */
const haveSameHeightSignature = (prev: MenuItem[], next: MenuItem[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    // Only compare properties that might affect height
    if (prev[i].label !== next[i].label) return false;
  }
  return true;
};
