/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, NavigationStructure, SecondaryMenuItem } from '../../types';

export interface ActiveItemsState {
  primaryItem: MenuItem | null;
  secondaryItem: SecondaryMenuItem | null;
}

/**
 * Utility function to determine the active menu items based on the `activeItemId`.
 *
 * @param items - the navigation structure.
 * @param activeItemId - the active item ID.
 * @returns the active items state including: `primaryItem` and `secondaryItem`.
 */
export const getActiveItems = (
  items: NavigationStructure,
  activeItemId?: string
): ActiveItemsState => {
  if (!activeItemId) {
    return { primaryItem: null, secondaryItem: null };
  }

  // Search the secondary menu items using their IDs (prioritize children over parents)
  for (const primary of [...items.primaryItems, ...(items.overflowItems ?? [])]) {
    if (!primary.sections) continue;

    for (const section of primary.sections) {
      const secondaryItem = section.items.find((item) => item.id === activeItemId);
      if (secondaryItem) {
        return { primaryItem: primary, secondaryItem };
      }
    }
  }

  // Search the secondary items of footer items
  for (const footer of items.footerItems) {
    if (!footer.sections) continue;

    for (const section of footer.sections) {
      const secondaryItem = section.items.find((item) => item.id === activeItemId);
      if (secondaryItem) {
        return { primaryItem: footer, secondaryItem };
      }
    }
  }

  // Search the primary and overflow menu items using their IDs
  const primaryItem = [...items.primaryItems, ...(items.overflowItems ?? [])].find(
    (item) => item.id === activeItemId
  );
  if (primaryItem) {
    return { primaryItem, secondaryItem: null };
  }

  // Search the footer items using their IDs
  const footerItem = items.footerItems.find((item) => item.id === activeItemId);
  if (footerItem) {
    return { primaryItem: footerItem, secondaryItem: null };
  }

  return { primaryItem: null, secondaryItem: null };
};
