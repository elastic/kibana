/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DiscoverAppMenuConfig,
  DiscoverAppMenuItemType,
  DiscoverAppMenuPopoverItem,
  DiscoverAppMenuPrimaryActionItem,
  DiscoverAppMenuSecondaryActionItem,
} from '../../types';

/**
 * Registry for managing AppMenuConfig items with Discover-specific types.
 * All run actions automatically receive DiscoverAppMenuRunActionParams with guaranteed onFinishAction.
 */
export class AppMenuRegistry {
  static CUSTOM_ITEMS_LIMIT = 2;
  private items: Map<string, DiscoverAppMenuItemType & { isCustom?: boolean }> = new Map();
  private primaryActionItem?: DiscoverAppMenuPrimaryActionItem;
  private secondaryActionItem?: DiscoverAppMenuSecondaryActionItem;

  /**
   * Register a custom menu item.
   * @param item The menu item to register
   */
  public registerCustomItem(item: DiscoverAppMenuItemType) {
    this.items.set(item.id, { ...item, isCustom: true });
  }

  /**
   * Register a custom popover item under a parent menu item.
   * @param parentId The ID of the parent menu item
   * @param popoverItem The popover item to register
   */
  public registerCustomPopoverItem(parentId: string, popoverItem: DiscoverAppMenuPopoverItem) {
    const parent = this.items.get(parentId);
    if (parent) {
      this.items.set(parentId, {
        ...parent,
        items: [...(parent.items || []), popoverItem],
      });
    }
  }

  /**
   * Register a menu item.
   * @param item The menu item to register
   */
  public registerItem(item: DiscoverAppMenuItemType) {
    this.items.set(item.id, { ...item, isCustom: false });
  }

  /**
   * Register multiple menu items at once.
   * @param items Array of menu items to register
   */
  public registerItems(items: DiscoverAppMenuItemType[]) {
    items.forEach((item) => this.registerItem(item));
  }

  /**
   * Set the primary action item for the app menu.
   * @param item The primary action item
   */
  public setPrimaryActionItem(item: DiscoverAppMenuPrimaryActionItem) {
    this.primaryActionItem = item;
  }

  /**
   * Set the secondary action item for the app menu.
   * @param item The secondary action item
   */
  public setSecondaryActionItem(item: DiscoverAppMenuSecondaryActionItem) {
    this.secondaryActionItem = item;
  }

  /**
   * Register a popover item for a specific parent menu item.
   * @param parentId The ID of the parent menu item
   * @param popoverItem The popover item to register
   */
  public registerPopoverItem(parentId: string, popoverItem: DiscoverAppMenuPopoverItem) {
    const parent = this.items.get(parentId);
    if (parent) {
      this.items.set(parentId, {
        ...parent,
        items: [...(parent.items || []), popoverItem],
      });
    }
  }

  /**
   * Get a menu item by ID.
   * @param id The ID of the menu item to retrieve
   * @returns The menu item or undefined if not found
   */
  public getItem(id: string): DiscoverAppMenuItemType | undefined {
    const item = this.items.get(id);
    if (item) {
      const { isCustom, ...cleanItem } = item;
      return cleanItem;
    }
    return undefined;
  }

  /**
   * Merge popover items from a source menu into a target submenu.
   * @param targetMenuId The ID of the target menu item
   * @param targetSubmenuId The ID of the submenu within the target menu to merge items into
   * @param sourceMenuId The ID of the source menu item whose items should be merged
   */
  public mergePopoverItems(
    targetMenuId: string,
    targetSubmenuId: string,
    sourceMenuId: string
  ): void {
    const targetMenu = this.items.get(targetMenuId);
    const sourceMenu = this.items.get(sourceMenuId);

    if (!targetMenu || !sourceMenu || !sourceMenu.items?.length) {
      return;
    }

    const updatedItems = targetMenu.items?.map((item) => {
      if (item.id === targetSubmenuId && item.items) {
        // Sort items by order, putting source items before "manage rules" (which has MAX_SAFE_INTEGER order)
        const mergedItems = [...item.items, ...sourceMenu.items!].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        return { ...item, items: mergedItems };
      }
      return item;
    });

    this.items.set(targetMenuId, {
      ...targetMenu,
      items: updatedItems,
    });
  }

  /**
   * Get the complete AppMenuConfig.
   * Items with registered popover items will have their items property populated.
   */
  public getAppMenuConfig(): DiscoverAppMenuConfig {
    const allItems = Array.from(this.items.values());
    const regularItems = allItems.filter((item) => !item.isCustom);
    const customItems = allItems
      .filter((item) => item.isCustom)
      .slice(0, AppMenuRegistry.CUSTOM_ITEMS_LIMIT);

    const cleanItems = [...regularItems, ...customItems].map(({ isCustom, ...item }) => item);

    return {
      items: cleanItems,
      primaryActionItem: this.primaryActionItem,
      secondaryActionItem: this.secondaryActionItem,
    };
  }
}
