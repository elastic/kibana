/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem } from '../../types';

/**
 * Utility function for splitting menu items into `visible` and `overflow` based on available space
 * @param allItems - All menu items to partition
 * @param maxVisibleCount - Maximum number of items that can be displayed in the primary menu
 */
export const partitionMenuItems = (
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
