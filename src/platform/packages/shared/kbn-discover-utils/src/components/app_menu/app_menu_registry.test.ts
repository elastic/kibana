/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuRegistry } from './app_menu_registry';
import type { AppMenuItemType, AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';

describe('AppMenuRegistry', () => {
  let registry: AppMenuRegistry;

  beforeEach(() => {
    registry = new AppMenuRegistry();
  });

  describe('registerItem', () => {
    it('should register a single menu item', () => {
      const item: AppMenuItemType = {
        id: 'test-item',
        order: 1,
        label: 'Test Item',
        iconType: 'search',
        testId: 'testItem',
        run: jest.fn(),
      };

      registry.registerItem(item);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(1);
      expect(config.items?.[0]).toEqual(item);
    });

    it('should update an existing item with the same ID', () => {
      const item1: AppMenuItemType = {
        id: 'test-item',
        order: 1,
        label: 'Test Item 1',
        iconType: 'search',
        run: jest.fn(),
      };

      const item2: AppMenuItemType = {
        id: 'test-item',
        order: 2,
        label: 'Test Item 2',
        iconType: 'bell',
        run: jest.fn(),
      };

      registry.registerItem(item1);
      registry.registerItem(item2);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(1);
      expect(config.items?.[0]).toEqual(item2);
    });
  });

  describe('registerItems', () => {
    it('should register multiple items at once', () => {
      const items: AppMenuItemType[] = [
        {
          id: 'item-1',
          order: 1,
          label: 'Item 1',
          iconType: 'search',
          run: jest.fn(),
        },
        {
          id: 'item-2',
          order: 2,
          label: 'Item 2',
          iconType: 'alert',
          run: jest.fn(),
        },
        {
          id: 'item-3',
          order: 3,
          label: 'Item 3',
          iconType: 'bell',
          run: jest.fn(),
        },
      ];

      registry.registerItems(items);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(3);
    });
  });

  describe('setPrimaryActionItem', () => {
    it('should set the primary action item', () => {
      const primaryItem = {
        id: 'primary',
        label: 'Primary',
        iconType: 'save',
        run: jest.fn(),
        testId: 'primaryButton',
      };

      registry.setPrimaryActionItem(primaryItem);

      const config = registry.getAppMenuConfig();
      expect(config.primaryActionItem).toEqual(primaryItem);
    });

    it('should allow updating the primary action item', () => {
      const primaryItem1 = {
        id: 'primary',
        label: 'Primary 1',
        iconType: 'save',
        run: jest.fn(),
      };

      const primaryItem2 = {
        id: 'primary',
        label: 'Primary 2',
        iconType: 'save',
        run: jest.fn(),
      };

      registry.setPrimaryActionItem(primaryItem1);
      registry.setPrimaryActionItem(primaryItem2);

      const config = registry.getAppMenuConfig();
      expect(config.primaryActionItem).toEqual(primaryItem2);
    });
  });

  describe('setSecondaryActionItem', () => {
    it('should set the secondary action item', () => {
      const secondaryItem = {
        id: 'secondary',
        label: 'Secondary',
        iconType: 'cross',
        run: jest.fn(),
        testId: 'secondaryButton',
      };

      registry.setSecondaryActionItem(secondaryItem);

      const config = registry.getAppMenuConfig();
      expect(config.secondaryActionItem).toEqual(secondaryItem);
    });
  });

  describe('registerPopoverItem', () => {
    it('should register a popover item under a parent menu item', () => {
      const parentItem: AppMenuItemType = {
        id: 'parent',
        order: 1,
        label: 'Parent',
        iconType: 'alert',
        items: [],
      };

      const popoverItem: AppMenuPopoverItem = {
        id: 'child-1',
        order: 1,
        label: 'Child 1',
        iconType: 'bell',
        run: jest.fn(),
      };

      registry.registerItem(parentItem);
      registry.registerPopoverItem('parent', popoverItem);

      const config = registry.getAppMenuConfig();
      const parent = config.items?.find((item) => item.id === 'parent');

      expect(parent?.items).toBeDefined();
      expect(parent?.items).toHaveLength(1);
      expect(parent?.items?.[0]).toEqual(popoverItem);
    });
  });

  describe('registerCustomItem', () => {
    it('should register a custom menu item', () => {
      const customItem: AppMenuItemType = {
        id: 'custom-item',
        order: 1,
        label: 'Custom Item',
        iconType: 'beaker',
        testId: 'customItem',
        run: jest.fn(),
      };

      registry.registerCustomItem(customItem);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(1);
      expect(config.items?.[0]).toEqual(customItem);
    });

    it('should update an existing custom item with the same ID', () => {
      const customItem1: AppMenuItemType = {
        id: 'custom-item',
        order: 1,
        label: 'Custom Item 1',
        iconType: 'beaker',
        run: jest.fn(),
      };

      const customItem2: AppMenuItemType = {
        id: 'custom-item',
        order: 2,
        label: 'Custom Item 2',
        iconType: 'bolt',
        run: jest.fn(),
      };

      registry.registerCustomItem(customItem1);
      registry.registerCustomItem(customItem2);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(1);
      expect(config.items?.[0]).toEqual(customItem2);
    });

    it('should limit custom items to CUSTOM_ITEMS_LIMIT', () => {
      const customItem1: AppMenuItemType = {
        id: 'custom-1',
        order: 1,
        label: 'Custom 1',
        iconType: 'beaker',
        run: jest.fn(),
      };

      const customItem2: AppMenuItemType = {
        id: 'custom-2',
        order: 2,
        label: 'Custom 2',
        iconType: 'bolt',
        run: jest.fn(),
      };

      const customItem3: AppMenuItemType = {
        id: 'custom-3',
        order: 3,
        label: 'Custom 3',
        iconType: 'brush',
        run: jest.fn(),
      };

      registry.registerCustomItem(customItem1);
      registry.registerCustomItem(customItem2);
      registry.registerCustomItem(customItem3);

      const config = registry.getAppMenuConfig();
      // Should only include the first 2 items due to CUSTOM_ITEMS_LIMIT
      expect(config.items).toHaveLength(AppMenuRegistry.CUSTOM_ITEMS_LIMIT);
      expect(config.items?.[0].id).toBe('custom-1');
      expect(config.items?.[1].id).toBe('custom-2');
    });

    it('should merge custom items with regular items', () => {
      const regularItem: AppMenuItemType = {
        id: 'regular-item',
        order: 2,
        label: 'Regular Item',
        iconType: 'search',
        run: jest.fn(),
      };

      const customItem: AppMenuItemType = {
        id: 'custom-item',
        order: 1,
        label: 'Custom Item',
        iconType: 'beaker',
        run: jest.fn(),
      };

      registry.registerItem(regularItem);
      registry.registerCustomItem(customItem);

      const config = registry.getAppMenuConfig();
      expect(config.items).toHaveLength(2);
    });
  });

  describe('registerCustomPopoverItem', () => {
    it('should register a popover item under a custom parent menu item', () => {
      const parentItem: AppMenuItemType = {
        id: 'custom-parent',
        order: 1,
        label: 'Custom Parent',
        iconType: 'beaker',
        items: [],
      };

      const popoverItem: AppMenuPopoverItem = {
        id: 'custom-child-1',
        order: 1,
        label: 'Custom Child 1',
        iconType: 'bell',
        run: jest.fn(),
      };

      registry.registerCustomItem(parentItem);
      registry.registerCustomPopoverItem('custom-parent', popoverItem);

      const config = registry.getAppMenuConfig();
      const parent = config.items?.find((item) => item.id === 'custom-parent');

      expect(parent?.items).toBeDefined();
      expect(parent?.items).toHaveLength(1);
      expect(parent?.items?.[0]).toEqual(popoverItem);
    });

    it('should handle registering custom popover items before parent exists', () => {
      const popoverItem: AppMenuPopoverItem = {
        id: 'custom-child-1',
        order: 1,
        label: 'Custom Child 1',
        run: jest.fn(),
      };

      // Register popover item first
      registry.registerCustomPopoverItem('custom-parent', popoverItem);

      const parentItem: AppMenuItemType = {
        id: 'custom-parent',
        order: 1,
        label: 'Custom Parent',
        iconType: 'beaker',
        items: [],
      };

      // Then register parent
      registry.registerCustomItem(parentItem);

      const config = registry.getAppMenuConfig();
      const parent = config.items?.find((item) => item.id === 'custom-parent');

      // The second registerCustomItem should overwrite the parent, losing the popover items
      expect(parent?.items).toEqual([]);
    });

    it('should handle multiple custom popover items with same order', () => {
      const parentItem: AppMenuItemType = {
        id: 'custom-parent',
        order: 1,
        label: 'Custom Parent',
        iconType: 'beaker',
        items: [],
      };

      const popoverItem1: AppMenuPopoverItem = {
        id: 'custom-child-1',
        label: 'Custom Child 1',
        order: 1,
        run: jest.fn(),
      };

      const popoverItem2: AppMenuPopoverItem = {
        id: 'custom-child-2',
        label: 'Custom Child 2',
        order: 1,
        run: jest.fn(),
      };

      registry.registerCustomItem(parentItem);
      registry.registerCustomPopoverItem('custom-parent', popoverItem1);
      registry.registerCustomPopoverItem('custom-parent', popoverItem2);

      const config = registry.getAppMenuConfig();
      const parent = config.items?.find((item) => item.id === 'custom-parent');

      expect(parent?.items).toHaveLength(2);
      // Both items have same order, so they should maintain insertion order
      expect(parent?.items?.[0].id).toBe('custom-child-1');
      expect(parent?.items?.[1].id).toBe('custom-child-2');
    });
  });

  describe('getAppMenuConfig', () => {
    it('should return complete AppMenuConfig with all components', () => {
      const item1: AppMenuItemType = {
        id: 'item-1',
        order: 1,
        label: 'Item 1',
        iconType: 'search',
        run: jest.fn(),
      };

      const item2: AppMenuItemType = {
        id: 'item-2',
        order: 2,
        label: 'Item 2',
        iconType: 'share',
        items: [],
      };

      const popoverItem: AppMenuPopoverItem = {
        id: 'popover-1',
        order: 1,
        label: 'Popover 1',
        run: jest.fn(),
      };

      const primaryItem = {
        id: 'primary',
        label: 'Save',
        iconType: 'save',
        run: jest.fn(),
      };

      const secondaryItem = {
        id: 'secondary',
        label: 'Cancel',
        iconType: 'cross',
        run: jest.fn(),
      };

      registry.registerItems([item1, item2]);
      registry.registerPopoverItem('item-2', popoverItem);
      registry.setPrimaryActionItem(primaryItem);
      registry.setSecondaryActionItem(secondaryItem);

      const config = registry.getAppMenuConfig();

      expect(config.items).toHaveLength(2);
      expect(config.primaryActionItem).toEqual(primaryItem);
      expect(config.secondaryActionItem).toEqual(secondaryItem);

      const item2Config = config.items?.find((item) => item.id === 'item-2');
      expect(item2Config?.items).toHaveLength(1);
    });

    it('should return empty items array when no items registered', () => {
      const config = registry.getAppMenuConfig();

      expect(config.items).toEqual([]);
      expect(config.primaryActionItem).toBeUndefined();
      expect(config.secondaryActionItem).toBeUndefined();
    });

    it('should include both regular and custom items', () => {
      const regularItem: AppMenuItemType = {
        id: 'regular',
        order: 2,
        label: 'Regular',
        iconType: 'search',
        run: jest.fn(),
      };

      const customItem: AppMenuItemType = {
        id: 'custom',
        order: 1,
        label: 'Custom',
        iconType: 'beaker',
        run: jest.fn(),
      };

      registry.registerItem(regularItem);
      registry.registerCustomItem(customItem);

      const config = registry.getAppMenuConfig();

      expect(config.items).toHaveLength(2);
    });
  });
});
