/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, SecondaryMenuSection } from '@kbn/ui-side-navigation/types';

import { extensionSlotHasData } from '../utils';
import type { NavigationItems } from '../../to_navigation_items';

export type ExtensionVisibility = 'pending' | 'hidden' | 'shown';

export interface ExtensionVisibilityStore {
  readonly visibilityRevision: number;
  get(extensionId: string): ExtensionVisibility;
  reportData(extensionId: string, value: unknown): void;
  syncExtensionIds(activeExtensionIds: string[]): void;
  getVisibleNavigationItems(baseItems: NavigationItems, atRevision: number): NavigationItems;
  subscribeTree(listener: () => void): () => void;
}

interface FilteredNavigationCache {
  baseItems: NavigationItems;
  revision: number;
  result: NavigationItems;
}

const shouldShowExtensionSection = (
  section: SecondaryMenuSection,
  hideWhenEmptyExtensionIds: ReadonlySet<string>,
  getVisibility: (extensionId: string) => ExtensionVisibility
): boolean => {
  if (!section.extensionId) {
    return true;
  }

  if (!hideWhenEmptyExtensionIds.has(section.extensionId)) {
    return true;
  }

  return getVisibility(section.extensionId) === 'shown';
};

const filterMenuItem = (
  item: MenuItem,
  hideWhenEmptyExtensionIds: ReadonlySet<string>,
  getVisibility: (extensionId: string) => ExtensionVisibility
): MenuItem | null => {
  if (!item.sections?.length) {
    return item;
  }

  const sections = item.sections.filter((section) =>
    shouldShowExtensionSection(section, hideWhenEmptyExtensionIds, getVisibility)
  );

  if (sections.length === 0) {
    return { ...item, sections: undefined };
  }

  if (sections.length === item.sections.length) {
    return item;
  }

  return { ...item, sections };
};

const filterMenuItems = (
  menuItems: MenuItem[],
  hideWhenEmptyExtensionIds: ReadonlySet<string>,
  getVisibility: (extensionId: string) => ExtensionVisibility
): MenuItem[] => {
  const filtered: MenuItem[] = [];

  for (const item of menuItems) {
    const nextItem = filterMenuItem(item, hideWhenEmptyExtensionIds, getVisibility);
    if (nextItem) {
      filtered.push(nextItem);
    }
  }

  if (
    filtered.length === menuItems.length &&
    filtered.every((item, index) => item === menuItems[index])
  ) {
    return menuItems;
  }

  return filtered;
};

const filterNavigationItems = (
  baseItems: NavigationItems,
  getVisibility: (extensionId: string) => ExtensionVisibility
): NavigationItems => {
  const { hideWhenEmptyExtensionIds } = baseItems;
  const primaryItems = filterMenuItems(
    baseItems.navItems.primaryItems,
    hideWhenEmptyExtensionIds,
    getVisibility
  );

  const footerItems = filterMenuItems(
    baseItems.navItems.footerItems,
    hideWhenEmptyExtensionIds,
    getVisibility
  );

  const overflowItems = baseItems.navItems.overflowItems
    ? filterMenuItems(baseItems.navItems.overflowItems, hideWhenEmptyExtensionIds, getVisibility)
    : undefined;

  const primaryUnchanged = primaryItems === baseItems.navItems.primaryItems;
  const footerUnchanged = footerItems === baseItems.navItems.footerItems;
  const overflowUnchanged = overflowItems === baseItems.navItems.overflowItems;

  if (primaryUnchanged && footerUnchanged && overflowUnchanged) {
    return baseItems;
  }

  return {
    ...baseItems,
    navItems: {
      ...baseItems.navItems,
      primaryItems,
      footerItems,
      overflowItems,
    },
  };
};

export const createExtensionVisibilityStore = (): ExtensionVisibilityStore => {
  const visibilityByExtensionId = new Map<string, ExtensionVisibility>();
  const treeListeners = new Set<() => void>();
  let visibilityRevision = 0;
  let filteredCache: FilteredNavigationCache | undefined;

  const notifyTreeListeners = () => {
    for (const listener of treeListeners) {
      listener();
    }
  };

  const bumpRevision = () => {
    visibilityRevision += 1;
    filteredCache = undefined;
    notifyTreeListeners();
  };

  return {
    get visibilityRevision() {
      return visibilityRevision;
    },

    get(extensionId: string): ExtensionVisibility {
      return visibilityByExtensionId.get(extensionId) ?? 'pending';
    },

    reportData(extensionId: string, value: unknown): void {
      const current = visibilityByExtensionId.get(extensionId) ?? 'pending';

      if (current === 'shown') {
        return;
      }

      const hasContent = extensionSlotHasData(value);
      const next: ExtensionVisibility = hasContent ? 'shown' : 'hidden';

      if (next === current) {
        return;
      }

      visibilityByExtensionId.set(extensionId, next);
      bumpRevision();
    },

    syncExtensionIds(activeExtensionIds: string[]): void {
      const activeIds = new Set(activeExtensionIds);
      let changed = false;

      for (const extensionId of visibilityByExtensionId.keys()) {
        if (!activeIds.has(extensionId)) {
          visibilityByExtensionId.delete(extensionId);
          changed = true;
        }
      }

      if (changed) {
        bumpRevision();
      }
    },

    getVisibleNavigationItems(baseItems: NavigationItems, atRevision: number): NavigationItems {
      if (atRevision !== visibilityRevision) {
        throw new Error(
          `Stale visibilityRevision (${atRevision} !== ${visibilityRevision}). ` +
            `Ensure navigation.tsx passes visibilityRevision from useSyncExternalStore.`
        );
      }

      if (filteredCache?.baseItems === baseItems && filteredCache.revision === atRevision) {
        return filteredCache.result;
      }

      const result = filterNavigationItems(
        baseItems,
        (extensionId) => visibilityByExtensionId.get(extensionId) ?? 'pending'
      );
      filteredCache = { baseItems, revision: atRevision, result };
      return result;
    },

    subscribeTree(listener: () => void): () => void {
      treeListeners.add(listener);
      return () => {
        treeListeners.delete(listener);
      };
    },
  };
};
