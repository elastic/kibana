/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuCalculations } from '../../types';
import { EXPANDED_MENU_ITEM_HEIGHT } from '../constants';

/**
 * Utility function for calculating how many menu items can fit using cumulative height calculation
 * @param calculations - The calculations object containing available height, item gap, and max visible items
 * @param actualItemHeights - Array of actual heights of menu items
 */
export const calculateVisibleItemCount = (
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
