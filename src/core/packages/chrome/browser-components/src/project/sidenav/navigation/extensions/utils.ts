/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem } from '@kbn/ui-side-navigation/types';
import type { ExtensionVisibilityStore } from './visibility_layer/store';
import type { NavigationItems } from '../to_navigation_items';

export const applyExtensionVisibility = (
  baseItems: NavigationItems,
  store: ExtensionVisibilityStore,
  visibilityRevision: number
): NavigationItems => {
  return store.getVisibleNavigationItems(baseItems, visibilityRevision);
};

const collectFromMenuItems = (menuItems: MenuItem[], extensionIds: Set<string>) => {
  for (const item of menuItems) {
    for (const section of item.sections ?? []) {
      if (section.extensionId) {
        extensionIds.add(section.extensionId);
      }
    }
  }
};

/** Collects unique extension ids referenced in a converted navigation structure. */
export const collectExtensionIds = (items: NavigationItems): string[] => {
  const extensionIds = new Set<string>();

  collectFromMenuItems(items.navItems.primaryItems, extensionIds);
  collectFromMenuItems(items.navItems.footerItems, extensionIds);
  collectFromMenuItems(items.navItems.overflowItems ?? [], extensionIds);

  return Array.from(extensionIds);
};

/** True when the extension data$ emission carries renderable payload. */
export const extensionSlotHasData = (value: unknown): boolean => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return false;
  }
  return true;
};
