/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_MENU_ITEMS } from '../constants';

/**
 * Utility function to get the number of visible menu items until we reach the menu height or the limit of menu items.
 *
 * @param heights - The heights of the menu items.
 * @param gap - The gap between the menu items.
 * @param menuHeight - The height of the menu.
 * @param hasUserHiddenItems - Whether there are user-hidden items that would be moved to the
 * overflow menu (affects available height).
 * @returns The number of visible menu items.
 */
export const countVisibleMenuItems = (
  heights: number[],
  gap: number,
  menuHeight: number,
  hasUserHiddenItems: boolean = false
): number => {
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

  // 2. If not all items are visible, or the "More" button is always present
  // (e.g. due to hidden-by-user items), reserve space for the "More" button.
  if (heights.length > initialVisibleCount || hasUserHiddenItems) {
    const moreItemHeight = heights[0]; // Approximately the same height as any other item
    const availableHeight = menuHeight - moreItemHeight - gap;

    return countItemsToFit(availableHeight, MAX_MENU_ITEMS - 1);
  }

  return initialVisibleCount;
};
