/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { MenuItem } from '../../types';

const MAX_NEW_PRIMARY_ITEMS = 2;
const MAX_NEW_SECONDARY_ITEMS_PER_PARENT = 2;
const NEW_ITEMS_STORAGE_KEY = 'core.chrome.sidenav.newItems';

const isNew = (item: { badgeType?: string }) => item.badgeType === 'new';

const getPrimaryItemById = (items: MenuItem[], id: string) => items.find((item) => item.id === id);

const getSecondaryItemById = (items: MenuItem[], id: string) => {
  for (const parentItem of items) {
    for (const section of parentItem.sections ?? []) {
      const secondaryItem = section.items.find((sectionItem) => sectionItem.id === id);
      if (secondaryItem) return { secondaryItem, parentItem };
    }
  }
  return null;
};

const getNewItemsIds = (item: MenuItem) => {
  if (isNew(item)) return [item.id];

  const secondaryNewIds: string[] = [];
  item.sections?.forEach((section) => {
    section.items.forEach((subItem) => {
      if (isNew(subItem)) secondaryNewIds.push(subItem.id);
    });
  });
  return secondaryNewIds;
};

/**
 * Manages 'new' item status with a max of 2 'new' items per level:
 * - Max 2 new primary items
 * - Max 2 new secondary items per parent
 * @param menuItems - Array of menu items to check
 * @param activeItemId - Currently active item ID for auto-marking as visited
 * @returns Functions to check new item status and mark item as visited
 */

export const useNewItems = (menuItems: MenuItem[], activeItemId?: string) => {
  const [visitedItems, setVisitedItems] = useState<string[]>(() => {
    const stored = localStorage.getItem(NEW_ITEMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Recalculate new items on each render to account for potential changes in the navigation tree
  const newItems = useMemo(() => {
    const updatedNewItems: string[] = [];
    let newPrimaryItemsCount = 0;

    // Check for current new primary and secondary items
    menuItems.forEach((item) => {
      const newItemIds = getNewItemsIds(item);

      // Skip if no new items or max limit reached for primary items
      if (newItemIds.length === 0) return;
      if (newPrimaryItemsCount >= MAX_NEW_PRIMARY_ITEMS) return;

      // Add primary items or secondary items to the updated new items list
      const itemsToAdd = isNew(item)
        ? [item.id]
        : newItemIds.slice(0, MAX_NEW_SECONDARY_ITEMS_PER_PARENT);
      updatedNewItems.push(...itemsToAdd);
      newPrimaryItemsCount++;
    });

    return updatedNewItems;
  }, [menuItems]);

  // Mark items as visited and persist to localStorage
  const markAsVisited = useCallback((itemId: string, parentItemId?: string) => {
    setVisitedItems((prev) => {
      const hasBeenVisited = (id: string) => prev.includes(id);

      const shouldUpdateVisitedItem = !hasBeenVisited(itemId);
      const shouldUpdateVisitedParentItem = parentItemId && !hasBeenVisited(parentItemId);

      if (!shouldUpdateVisitedItem && !shouldUpdateVisitedParentItem) return prev;

      const updated = [...prev];
      if (shouldUpdateVisitedItem) updated.push(itemId);
      if (shouldUpdateVisitedParentItem) updated.push(parentItemId);

      try {
        localStorage.setItem(NEW_ITEMS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Active items should be automatically marked as visited
  // This is to tackle other ways of navigating to a page such as via global search/breadcrumbs etc.
  useEffect(() => {
    if (!activeItemId) return;

    // Check if active item is a primary item
    const activePrimaryItem = getPrimaryItemById(menuItems, activeItemId);
    if (activePrimaryItem) {
      if (isNew(activePrimaryItem)) markAsVisited(activeItemId);
      return;
    }

    // Check if active item is a secondary item
    const activeSecondaryItem = getSecondaryItemById(menuItems, activeItemId);
    if (!activeSecondaryItem) return;

    const { secondaryItem, parentItem } = activeSecondaryItem;
    const parentIsNew = isNew(parentItem);
    const secondaryIsNew = isNew(secondaryItem);

    // Mark as visited if either the parent or the secondary item is new
    if (parentIsNew || secondaryIsNew) {
      markAsVisited(activeItemId, parentIsNew ? parentItem.id : undefined);
    }
  }, [menuItems, activeItemId, markAsVisited]);

  const isNewPrimary = useCallback(
    (itemId: string) => {
      const item = getPrimaryItemById(menuItems, itemId);
      if (!item) return false;

      const newPrimaryItemsIds = getNewItemsIds(item).filter((id) => newItems.includes(id));
      return newPrimaryItemsIds.some((id) => !visitedItems.includes(id));
    },
    [menuItems, newItems, visitedItems]
  );

  const isNewSecondary = useCallback((itemId: string) => newItems.includes(itemId), [newItems]);

  return { isNewPrimary, isNewSecondary, markAsVisited };
};
