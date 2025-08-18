/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, NavigationStructure, SecondaryMenuItem } from '../../types';

export interface InitialMenuState {
  primaryItem: MenuItem | null;
  secondaryItem: SecondaryMenuItem | null;
  isLogoActive: boolean;
}

/**
 * Utility function to determine the initial menu item based on the `activeItemId`
 */
export const getInitialActiveItems = (
  items: NavigationStructure,
  activeItemId?: string,
  logoId?: string
): InitialMenuState => {
  if (!activeItemId) {
    return { primaryItem: null, secondaryItem: null, isLogoActive: false };
  }

  // First, check if the logo is active
  if (logoId && activeItemId === logoId) {
    return { primaryItem: null, secondaryItem: null, isLogoActive: true };
  }

  // Second, search the primary menu items using their IDs
  const primaryItem = items.primaryItems.find((item) => item.id === activeItemId);
  if (primaryItem) {
    return { primaryItem, secondaryItem: null, isLogoActive: false };
  }

  // Third, search the footer items using their IDs
  const footerItem = items.footerItems.find((item) => item.id === activeItemId);
  if (footerItem) {
    return { primaryItem: footerItem, secondaryItem: null, isLogoActive: false };
  }

  // Fourth, search the secondary menu items using their IDs
  for (const primary of items.primaryItems) {
    if (!primary.sections) continue;

    for (const section of primary.sections) {
      const secondaryItem = section.items.find((item) => item.id === activeItemId);
      if (secondaryItem) {
        return { primaryItem: primary, secondaryItem, isLogoActive: false };
      }
    }
  }

  // Fifth, search the secondary items of footer items
  for (const footer of items.footerItems) {
    if (!footer.sections) continue;

    for (const section of footer.sections) {
      const secondaryItem = section.items.find((item) => item.id === activeItemId);
      if (secondaryItem) {
        return { primaryItem: footer, secondaryItem, isLogoActive: false };
      }
    }
  }

  return { primaryItem: null, secondaryItem: null, isLogoActive: false };
};
