/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  hasSingleTab,
  isLastTab,
  addTab,
  selectTab,
  insertTabAfter,
  replaceTabWith,
  closeTab,
  closeOtherTabs,
  closeTabsToTheRight,
} from './manage_tabs';

const items = Array.from({ length: 5 }).map((_, i) => ({
  id: `tab-${i}`,
  label: `Tab ${i}`,
}));

describe('manage_tabs', () => {
  describe('hasSingleTab', () => {
    it('returns true if there is only one tab', () => {
      expect(hasSingleTab({ items: [items[0]], selectedItem: null })).toBe(true);
    });

    it('returns false if there is more than one tab', () => {
      expect(hasSingleTab({ items, selectedItem: null })).toBe(false);
    });
  });

  describe('isLastTab', () => {
    it('returns true if the item is the last tab', () => {
      expect(isLastTab({ items, selectedItem: null }, items[4])).toBe(true);
    });

    it('returns true if the item is the only tab', () => {
      expect(isLastTab({ items: [items[0]], selectedItem: null }, items[0])).toBe(true);
    });

    it('returns false if the item is not the last tab', () => {
      expect(isLastTab({ items, selectedItem: null }, items[3])).toBe(false);
    });

    it('returns false if the item is not from the list', () => {
      expect(isLastTab({ items: [items[0], items[1]], selectedItem: null }, items[3])).toBe(false);
    });
  });

  describe('addTab', () => {
    it('adds a tab', () => {
      const maxItemsCount = 100;
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = addTab(prevState, newItem, maxItemsCount);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([...items, newItem]);
      expect(nextState.selectedItem).toBe(newItem);
    });

    it('should not add a tab if limit is reached', () => {
      const maxItemsCount = items.length;
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = addTab(prevState, newItem, maxItemsCount);

      expect(nextState.items).toBe(items);
      expect(nextState.selectedItem).toBe(items[0]);
    });
  });

  describe('selectTab', () => {
    it('selects a tab', () => {
      const prevState = { items, selectedItem: items[0] };
      const nextState = selectTab(prevState, items[1]);

      expect(nextState.items).toBe(items);
      expect(nextState.selectedItem).toBe(items[1]);
    });

    it("skips selecting a tab if it's not from the list", () => {
      const limitedItems = [items[0], items[1]];
      const prevState = { items: limitedItems, selectedItem: items[0] };
      const nextState = selectTab(prevState, items[2]);

      expect(nextState.items).toBe(limitedItems);
      expect(nextState.selectedItem).toBe(items[0]);
    });
  });

  describe('replaceTabWith', () => {
    it('replaces a tab with another tab', () => {
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = replaceTabWith(prevState, items[2], newItem);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], newItem, items[3], items[4]]);
      expect(nextState.selectedItem).toBe(newItem);
    });

    it("skips replacing a tab if it's not from the list", () => {
      const limitedItems = [items[0], items[1]];
      const prevState = { items: limitedItems, selectedItem: items[0] };
      const nextState = replaceTabWith(prevState, items[2], items[3]);

      expect(nextState.items).toBe(limitedItems);
      expect(nextState.selectedItem).toBe(items[0]);
    });
  });

  describe('insertTabAfter', () => {
    it('inserts a tab after another tab', () => {
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = insertTabAfter(prevState, newItem, items[2], undefined);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[2], newItem, items[3], items[4]]);
      expect(nextState.selectedItem).toBe(newItem);
    });

    it('should not insert a tab if the limit is reached', () => {
      const maxItemsCount = items.length;
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = insertTabAfter(prevState, newItem, items[2], maxItemsCount);

      expect(nextState.items).toBe(items);
      expect(nextState.selectedItem).toBe(items[0]);
    });

    it('inserts a tab after the last tab', () => {
      const newItem = { id: 'tab-5', label: 'Tab 5' };
      const prevState = { items, selectedItem: items[0] };
      const nextState = insertTabAfter(prevState, newItem, items[items.length - 1], 100);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[2], items[3], items[4], newItem]);
      expect(nextState.selectedItem).toBe(newItem);
    });
  });

  describe('closeTab', () => {
    it('closes a tab from the middle', () => {
      const prevState = { items, selectedItem: items[0] };
      const nextState = closeTab(prevState, items[2]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[3], items[4]]);
      expect(nextState.selectedItem).toBe(items[0]);
    });

    it('closes the first tab', () => {
      const prevState = { items, selectedItem: items[0] };
      const nextState = closeTab(prevState, items[0]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[1], items[2], items[3], items[4]]);
      expect(nextState.selectedItem).toBe(items[1]);
    });

    it('closes the last tab', () => {
      const prevState = { items, selectedItem: items[4] };
      const nextState = closeTab(prevState, items[items.length - 1]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[2], items[3]]);
      expect(nextState.selectedItem).toBe(items[3]);
    });

    it('closes the selected tab', () => {
      const prevState = { items, selectedItem: items[2] };
      const nextState = closeTab(prevState, items[2]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[3], items[4]]);
      expect(nextState.selectedItem).toBe(items[3]);
    });

    it("skips closing a tab if it's not from the list", () => {
      const limitedItems = [items[0], items[1]];
      const prevState = { items: limitedItems, selectedItem: items[0] };
      const nextState = closeTab(prevState, items[2]);

      expect(nextState.items).toBe(limitedItems);
      expect(nextState.selectedItem).toBe(items[0]);
    });
  });

  describe('closeOtherTabs', () => {
    it('closes other tabs', () => {
      const prevState = { items, selectedItem: items[1] };
      const nextState = closeOtherTabs(prevState, items[2]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[2]]);
      expect(nextState.selectedItem).toBe(items[2]);
    });

    it('closes other tabs and keeps the only tab', () => {
      const limitedItems = [items[2]];
      const prevState = { items: limitedItems, selectedItem: items[2] };
      const nextState = closeOtherTabs(prevState, items[2]);

      expect(nextState.items).not.toBe(limitedItems);
      expect(nextState.items).toEqual(limitedItems);
      expect(nextState.selectedItem).toBe(items[2]);
    });
  });

  describe('closeTabsToTheRight', () => {
    it('closes tabs to the right from the middle', () => {
      const prevState = { items, selectedItem: items[1] };
      const nextState = closeTabsToTheRight(prevState, items[2]);

      expect(nextState.items).not.toBe(items);
      expect(nextState.items).toEqual([items[0], items[1], items[2]]);
      expect(nextState.selectedItem).toBe(items[1]);
    });

    it('closes tabs to the right from the beginning', () => {
      const limitedItems = [items[0], items[1], items[2]];
      const prevState = { items: limitedItems, selectedItem: items[0] };
      const nextState = closeTabsToTheRight(prevState, items[0]);

      expect(nextState.items).not.toBe(limitedItems);
      expect(nextState.items).toEqual([items[0]]);
      expect(nextState.selectedItem).toBe(items[0]);
    });
  });
});
