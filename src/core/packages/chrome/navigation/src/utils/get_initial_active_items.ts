/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MenuItem, NavigationStructure, SecondaryMenuItem } from '../../types';

export interface InitialMenuState {
  primaryItem: MenuItem | null;
  secondaryItem: SecondaryMenuItem | null;
}

/**
 * Utility function to determine the initial menu item based on the `activeItemId`
 */
export const getInitialActiveItems = (
  items: NavigationStructure,
  activeItemId?: string
): InitialMenuState => {
  if (!activeItemId) {
    return { primaryItem: null, secondaryItem: null };
  }

  // First, search the primary menu items using their IDs
  const primaryItem = items.primaryItems.find((item) => item.id === activeItemId);
  if (primaryItem) {
    return { primaryItem, secondaryItem: null };
  }

  // Second, search the footer items using their IDs
  const footerItem = items.footerItems.find((item) => item.id === activeItemId);
  if (footerItem) {
    return { primaryItem: footerItem, secondaryItem: null };
  }

  // Third, search the secondary menu items using their IDs
  for (const primary of items.primaryItems) {
    if (!primary.sections) continue;

    for (const section of primary.sections) {
      const secondaryItem = section.items.find((item) => item.id === activeItemId);
      if (secondaryItem) {
        return { primaryItem: primary, secondaryItem };
      }
    }
  }

  return { primaryItem: null, secondaryItem: null };
};
