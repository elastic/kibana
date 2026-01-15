/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPopoverItem,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';

/**
 * Registry for managing AppMenuConfig items.
 * Works directly with AppMenuConfig types and allows registration of items,
 * primary/secondary actions, and popover items for specific parent items.
 */
export class AppMenuRegistry {
  private items: Map<string, AppMenuItemType> = new Map();
  private primaryActionItem?: AppMenuPrimaryActionItem;
  private secondaryActionItem?: AppMenuSecondaryActionItem;

  /**
   * Register a menu item.
   * @param item The menu item to register
   */
  public registerItem(item: AppMenuItemType) {
    this.items.set(item.id, item as AppMenuItemType);
  }

  /**
   * Register multiple menu items at once.
   * @param items Array of menu items to register
   */
  public registerItems(items: AppMenuItemType[]) {
    items.forEach((item) => this.registerItem(item));
  }

  /**
   * Set the primary action item for the app menu.
   * @param item The primary action item
   */
  public setPrimaryActionItem(item: AppMenuPrimaryActionItem) {
    this.primaryActionItem = item;
  }

  /**
   * Set the secondary action item for the app menu.
   * @param item The secondary action item
   */
  public setSecondaryActionItem(item: AppMenuSecondaryActionItem) {
    this.secondaryActionItem = item;
  }

  /**
   * Register a popover item for a specific parent menu item.
   * @param parentId The ID of the parent menu item
   * @param popoverItem The popover item to register
   */
  public registerPopoverItem(parentId: string, popoverItem: AppMenuPopoverItem) {
    this.items.set(parentId, {
      ...this.items.get(parentId),
      items: [...(this.items.get(parentId)?.items || []), popoverItem].sort(
        (a: AppMenuPopoverItem, b: AppMenuPopoverItem) => (a.order || 0) - (b.order || 0)
      ),
    } as AppMenuItemType);
  }

  /**
   * Get the complete AppMenuConfig.
   * Items with registered popover items will have their items property populated.
   */
  public getAppMenuConfig(): AppMenuConfig {
    return {
      items: Array.from(this.items.values()).sort(
        (a: AppMenuItemType, b: AppMenuItemType) => (a.order || 0) - (b.order || 0)
      ),
      primaryActionItem: this.primaryActionItem,
      secondaryActionItem: this.secondaryActionItem,
    };
  }
}
