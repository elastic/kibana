/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import {
  getDisplayedItemsAllowedAmount,
  getShouldOverflow,
  getAppMenuItems,
  mapAppMenuItemToPanelItem,
  getPopoverActionItems,
  getPopoverPanels,
  getIsSelectedColor,
} from './utils';
import { APP_MENU_ITEM_LIMIT } from './constants';
import type { AppMenuPopoverItem } from './types';

describe('utils', () => {
  describe('getDisplayedItemsAllowedAmount', () => {
    it('should return full limit when no action items', () => {
      const result = getDisplayedItemsAllowedAmount({});

      expect(result).toBe(APP_MENU_ITEM_LIMIT);
    });

    it('should reduce limit by 1 when primary action item is present', () => {
      const result = getDisplayedItemsAllowedAmount({
        primaryActionItem: { id: 'save', label: 'Save', run: jest.fn(), iconType: 'save' },
      });

      expect(result).toBe(APP_MENU_ITEM_LIMIT - 1);
    });

    it('should reduce limit by 1 when secondary action item is present', () => {
      const result = getDisplayedItemsAllowedAmount({
        secondaryActionItem: { id: 'cancel', label: 'Cancel', run: jest.fn(), iconType: 'cross' },
      });

      expect(result).toBe(APP_MENU_ITEM_LIMIT - 1);
    });

    it('should reduce limit by 2 when both action items are present', () => {
      const result = getDisplayedItemsAllowedAmount({
        primaryActionItem: { id: 'save', label: 'Save', run: jest.fn(), iconType: 'save' },
        secondaryActionItem: { id: 'cancel', label: 'Cancel', run: jest.fn(), iconType: 'cross' },
      });

      expect(result).toBe(APP_MENU_ITEM_LIMIT - 2);
    });
  });

  describe('getShouldOverflow', () => {
    it('should return false when config has no items', () => {
      const result = getShouldOverflow({
        config: {},
        displayedItemsAllowedAmount: 5,
      });

      expect(result).toBe(false);
    });

    it('should return false when items count is less than allowed amount', () => {
      const result = getShouldOverflow({
        config: {
          items: [
            { id: '1', label: 'Item 1', run: jest.fn(), iconType: 'gear', order: 1 },
            { id: '2', label: 'Item 2', run: jest.fn(), iconType: 'gear', order: 2 },
          ],
        },
        displayedItemsAllowedAmount: 5,
      });

      expect(result).toBe(false);
    });

    it('should return false when items count equals allowed amount', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        label: `Item ${i}`,
        run: jest.fn(),
        iconType: 'gear' as const,
        order: i,
      }));

      const result = getShouldOverflow({
        config: { items },
        displayedItemsAllowedAmount: 5,
      });

      expect(result).toBe(false);
    });

    it('should return true when items count exceeds allowed amount', () => {
      const items = Array.from({ length: 6 }, (_, i) => ({
        id: `${i}`,
        label: `Item ${i}`,
        run: jest.fn(),
        iconType: 'gear' as const,
        order: i,
      }));

      const result = getShouldOverflow({
        config: { items },
        displayedItemsAllowedAmount: 5,
      });

      expect(result).toBe(true);
    });
  });

  describe('getAppMenuItems', () => {
    it('should return empty arrays when config has no items', () => {
      const result = getAppMenuItems({ config: {} });

      expect(result).toEqual({
        displayedItems: [],
        overflowItems: [],
        shouldOverflow: false,
      });
    });

    it('should return all items as displayed when under limit', () => {
      const items = [
        { id: '1', label: 'Item 1', run: jest.fn(), iconType: 'gear' as const, order: 1 },
        { id: '2', label: 'Item 2', run: jest.fn(), iconType: 'gear' as const, order: 2 },
      ];

      const result = getAppMenuItems({ config: { items } });

      expect(result.displayedItems).toHaveLength(2);
      expect(result.overflowItems).toHaveLength(0);
      expect(result.shouldOverflow).toBe(false);
    });

    it('should sort items by order', () => {
      const items = [
        { id: '3', label: 'Item 3', run: jest.fn(), iconType: 'gear' as const, order: 3 },
        { id: '1', label: 'Item 1', run: jest.fn(), iconType: 'gear' as const, order: 1 },
        { id: '2', label: 'Item 2', run: jest.fn(), iconType: 'gear' as const, order: 2 },
      ];

      const result = getAppMenuItems({ config: { items } });

      expect(result.displayedItems[0].id).toBe('1');
      expect(result.displayedItems[1].id).toBe('2');
      expect(result.displayedItems[2].id).toBe('3');
    });

    it('should split items into displayed and overflow when exceeding limit', () => {
      const items = Array.from({ length: 7 }, (_, i) => ({
        id: `${i}`,
        label: `Item ${i}`,
        run: jest.fn(),
        iconType: 'gear' as const,
        order: i,
      }));

      const result = getAppMenuItems({ config: { items } });

      expect(result.displayedItems).toHaveLength(APP_MENU_ITEM_LIMIT);
      expect(result.overflowItems).toHaveLength(2);
      expect(result.shouldOverflow).toBe(true);
    });

    it('should account for action items when calculating overflow', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        label: `Item ${i}`,
        run: jest.fn(),
        iconType: 'gear' as const,
        order: i,
      }));

      const result = getAppMenuItems({
        config: {
          items,
          primaryActionItem: { id: 'save', label: 'Save', run: jest.fn(), iconType: 'save' },
        },
      });

      expect(result.displayedItems).toHaveLength(APP_MENU_ITEM_LIMIT - 1);
      expect(result.overflowItems).toHaveLength(1);
      expect(result.shouldOverflow).toBe(true);
    });
  });

  describe('mapAppMenuItemToPanelItem', () => {
    const baseItem: AppMenuPopoverItem = {
      id: 'test',
      label: 'test item',
      run: jest.fn(),
      order: 1,
    };

    it('should capitalize label', () => {
      const item = { ...baseItem, label: 'my label' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.name).toBe('My label');
    });

    it('should include icon when provided', () => {
      const item = { ...baseItem, iconType: 'gear' as const };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.icon).toBe('gear');
    });

    it('should set onClick handler when no href or childPanelId', () => {
      const result = mapAppMenuItemToPanelItem(baseItem);

      expect(result.onClick).toBeDefined();
    });

    it('should not set onClick when href is provided', () => {
      const item = { ...baseItem, href: 'http://example.com' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.onClick).toBeUndefined();
      expect(result.href).toBe('http://example.com');
    });

    it('should not set onClick when childPanelId is provided', () => {
      const result = mapAppMenuItemToPanelItem(baseItem, 1);

      expect(result.onClick).toBeUndefined();
      expect(result.panel).toBe(1);
    });

    it('should set target when href is provided', () => {
      const item = { ...baseItem, href: 'http://example.com', target: '_blank' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.target).toBe('_blank');
    });

    it('should not set target when no href', () => {
      const item = { ...baseItem, target: '_blank' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.target).toBeUndefined();
    });

    it('should set disabled state', () => {
      const item = { ...baseItem, disableButton: true };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.disabled).toBe(true);
    });

    it('should include testId as data-test-subj', () => {
      const item = { ...baseItem, testId: 'my-test-id' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result['data-test-subj']).toBe('my-test-id');
    });

    it('should include tooltip content and title', () => {
      const item = { ...baseItem, tooltipContent: 'Content', tooltipTitle: 'Title' };
      const result = mapAppMenuItemToPanelItem(item);

      expect(result.toolTipContent).toBe('Content');
      expect(result.toolTipProps?.title).toBe('Title');
    });
  });

  describe('getPopoverActionItems', () => {
    it('should return empty array when no action items provided', () => {
      const result = getPopoverActionItems({});

      expect(result).toEqual([]);
    });

    it('should return items with separator when primary action item is provided', () => {
      const result = getPopoverActionItems({
        primaryActionItem: { id: 'save', label: 'Save', run: jest.fn(), iconType: 'save' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].isSeparator).toBe(true);
      expect(result[1].key).toBe('action-items');
    });

    it('should return items with separator when secondary action item is provided', () => {
      const result = getPopoverActionItems({
        secondaryActionItem: { id: 'cancel', label: 'Cancel', run: jest.fn(), iconType: 'cross' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].isSeparator).toBe(true);
    });

    it('should return empty array when both items are hidden with "all"', () => {
      const result = getPopoverActionItems({
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
          hidden: 'all',
        },
        secondaryActionItem: {
          id: 'cancel',
          label: 'Cancel',
          run: jest.fn(),
          iconType: 'cross',
          hidden: 'all',
        },
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when both items are hidden at mobile breakpoints', () => {
      const result = getPopoverActionItems({
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
          hidden: ['xs', 's', 'm'],
        },
        secondaryActionItem: {
          id: 'cancel',
          label: 'Cancel',
          run: jest.fn(),
          iconType: 'cross',
          hidden: ['m'],
        },
      });

      expect(result).toEqual([]);
    });

    it('should return items when only one is hidden', () => {
      const result = getPopoverActionItems({
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
          hidden: 'all',
        },
        secondaryActionItem: {
          id: 'cancel',
          label: 'Cancel',
          run: jest.fn(),
          iconType: 'cross',
        },
      });

      expect(result).toHaveLength(2);
    });

    it('should return items when hidden at non-mobile breakpoints only', () => {
      const result = getPopoverActionItems({
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
          hidden: ['xl'],
        },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('getPopoverPanels', () => {
    it('should create single panel for flat items', () => {
      const items: AppMenuPopoverItem[] = [
        { id: '1', label: 'Item 1', run: jest.fn(), order: 1 },
        { id: '2', label: 'Item 2', run: jest.fn(), order: 2 },
      ];

      const { panels } = getPopoverPanels({ items });

      expect(panels).toHaveLength(1);
      expect(panels[0].id).toBe(0);
      expect(panels[0].items).toHaveLength(2);
    });

    it('should create nested panels for items with sub-items', () => {
      const items: AppMenuPopoverItem[] = [
        {
          id: '1',
          label: 'Parent',
          order: 1,
          items: [{ id: '1-1', label: 'Child', run: jest.fn(), order: 1 }],
        },
      ];

      const { panels } = getPopoverPanels({ items });

      expect(panels).toHaveLength(2);
      const mainPanel = panels.find((p) => p.id === 0);
      const childPanel = panels.find((p) => p.id === 1);

      expect(mainPanel).toBeDefined();
      expect(childPanel).toBeDefined();
      expect(childPanel?.title).toBe('Parent');
    });

    it('should add separator above item when separator is "above"', () => {
      const items: AppMenuPopoverItem[] = [
        { id: '1', label: 'Item 1', run: jest.fn(), order: 1, separator: 'above' },
      ];

      const { panels } = getPopoverPanels({ items });
      const panelItems = panels[0].items as Array<{ isSeparator?: boolean; key?: string }>;

      expect(panelItems[0].isSeparator).toBe(true);
      expect(panelItems[0].key).toBe('separator-1');
    });

    it('should add separator below item when separator is "below"', () => {
      const items: AppMenuPopoverItem[] = [
        { id: '1', label: 'Item 1', run: jest.fn(), order: 1, separator: 'below' },
      ];

      const { panels } = getPopoverPanels({ items });
      const panelItems = panels[0].items as Array<{ isSeparator?: boolean; key?: string }>;

      expect(panelItems[1].isSeparator).toBe(true);
      expect(panelItems[1].key).toBe('separator-1');
    });

    it('should append action items to main panel when provided', () => {
      const items: AppMenuPopoverItem[] = [{ id: '1', label: 'Item 1', run: jest.fn(), order: 1 }];

      const { panels } = getPopoverPanels({
        items,
        primaryActionItem: { id: 'save', label: 'Save', run: jest.fn(), iconType: 'save' },
      });

      const mainPanel = panels[0];
      const panelItems = mainPanel.items as Array<{ key?: string; isSeparator?: boolean }>;

      expect(panelItems).toHaveLength(3);
      expect(panelItems[1].isSeparator).toBe(true);
      expect(panelItems[2].key).toBe('action-items');
    });

    it('should use custom startPanelId', () => {
      const items: AppMenuPopoverItem[] = [{ id: '1', label: 'Item 1', run: jest.fn(), order: 1 }];

      const { panels } = getPopoverPanels({ items, startPanelId: 10 });

      expect(panels[0].id).toBe(10);
    });

    it('should handle deeply nested items', () => {
      const items: AppMenuPopoverItem[] = [
        {
          id: '1',
          label: 'Level 1',
          order: 1,
          items: [
            {
              id: '1-1',
              label: 'Level 2',
              order: 1,
              items: [{ id: '1-1-1', label: 'Level 3', run: jest.fn(), order: 1 }],
            },
          ],
        },
      ];

      const { panels } = getPopoverPanels({ items });

      expect(panels).toHaveLength(3);
    });

    it('should create panelIdToTestId mapping for items with popoverTestId', () => {
      const items: AppMenuPopoverItem[] = [
        {
          id: '1',
          label: 'Export',
          order: 1,
          popoverTestId: 'exportPopoverPanel',
          items: [
            {
              id: '1-1',
              label: 'PDF',
              run: jest.fn(),
              order: 1,
            },
          ],
        },
        {
          id: '2',
          label: 'Share',
          order: 2,
          popoverTestId: 'sharePopoverPanel',
          items: [
            {
              id: '2-1',
              label: 'Link',
              run: jest.fn(),
              order: 1,
            },
          ],
        },
      ];

      const { panels, panelIdToTestId } = getPopoverPanels({ items });

      expect(panels).toHaveLength(3);
      expect(panelIdToTestId['1']).toBe('exportPopoverPanel');
      expect(panelIdToTestId['2']).toBe('sharePopoverPanel');
      expect(panelIdToTestId['0']).toBeUndefined(); // Main panel has no test ID
    });
  });

  describe('getIsSelectedColor', () => {
    const mockEuiTheme = {
      components: {
        buttons: {
          backgroundFilledPrimaryHover: '#filled-primary',
          backgroundEmptyPrimaryHover: '#empty-primary',
          backgroundFilledTextHover: '#filled-text',
          backgroundEmptyTextHover: '#empty-text',
        },
      },
      colors: {
        backgroundBaseInteractiveHover: '#fallback',
      },
    } as unknown as EuiThemeComputed;

    it('should return filled primary hover color for filled primary button', () => {
      const result = getIsSelectedColor({
        color: 'primary',
        euiTheme: mockEuiTheme,
        isFilled: true,
      });

      expect(result).toBe('#filled-primary');
    });

    it('should return empty primary hover color for non-filled primary button', () => {
      const result = getIsSelectedColor({
        color: 'primary',
        euiTheme: mockEuiTheme,
        isFilled: false,
      });

      expect(result).toBe('#empty-primary');
    });

    it('should return empty text hover color for text button', () => {
      const result = getIsSelectedColor({
        color: 'text',
        euiTheme: mockEuiTheme,
        isFilled: false,
      });

      expect(result).toBe('#empty-text');
    });

    it('should return fallback color when color key does not exist', () => {
      const result = getIsSelectedColor({
        color: 'nonexistent' as any,
        euiTheme: mockEuiTheme,
        isFilled: false,
      });

      expect(result).toBe('#fallback');
    });
  });
});
