/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTabMenuItemsFn } from './get_tab_menu_items';
import { getNewTabPropsForIndex } from '../hooks/use_new_tab_props';
import { TabMenuItem, TabMenuItemName } from '../types';

const items = Array.from({ length: 5 }).map((_, i) => getNewTabPropsForIndex(i));

const mapMenuItem = (item: TabMenuItem) => {
  if (item === 'divider') {
    return 'divider';
  }
  return item.name;
};

describe('getTabMenuItemsFn', () => {
  it('returns correct menu items for a single tab', () => {
    const getTabMenuItems = getTabMenuItemsFn({
      tabsState: { items: [items[0]], selectedItem: items[0] },
      maxItemsCount: 10,
      onDuplicate: jest.fn(),
      onCloseOtherTabs: jest.fn(),
      onCloseTabsToTheRight: jest.fn(),
    });
    const menuItems = getTabMenuItems(items[0]);
    expect(menuItems.map(mapMenuItem)).toEqual([
      TabMenuItemName.enterRenamingMode,
      TabMenuItemName.duplicate,
    ]);
  });

  it('returns correct menu items for many tabs', () => {
    const getTabMenuItems = getTabMenuItemsFn({
      tabsState: { items, selectedItem: items[0] },
      maxItemsCount: 10,
      onDuplicate: jest.fn(),
      onCloseOtherTabs: jest.fn(),
      onCloseTabsToTheRight: jest.fn(),
    });
    const menuItems = getTabMenuItems(items[0]);
    expect(menuItems.map(mapMenuItem)).toEqual([
      TabMenuItemName.enterRenamingMode,
      TabMenuItemName.duplicate,
      'divider',
      TabMenuItemName.closeOtherTabs,
      TabMenuItemName.closeTabsToTheRight,
    ]);
  });

  it('returns correct menu items when max limit is reached', () => {
    const getTabMenuItems = getTabMenuItemsFn({
      tabsState: { items, selectedItem: items[0] },
      maxItemsCount: items.length,
      onDuplicate: jest.fn(),
      onCloseOtherTabs: jest.fn(),
      onCloseTabsToTheRight: jest.fn(),
    });
    const menuItems = getTabMenuItems(items[2]);
    expect(menuItems.map(mapMenuItem)).toEqual([
      TabMenuItemName.enterRenamingMode,
      'divider',
      TabMenuItemName.closeOtherTabs,
      TabMenuItemName.closeTabsToTheRight,
    ]);
  });

  it('returns correct menu items for the last item of many tabs', () => {
    const getTabMenuItems = getTabMenuItemsFn({
      tabsState: { items, selectedItem: items[0] },
      maxItemsCount: 10,
      onDuplicate: jest.fn(),
      onCloseOtherTabs: jest.fn(),
      onCloseTabsToTheRight: jest.fn(),
    });
    const menuItems = getTabMenuItems(items[items.length - 1]);
    expect(menuItems.map(mapMenuItem)).toEqual([
      TabMenuItemName.enterRenamingMode,
      TabMenuItemName.duplicate,
      'divider',
      TabMenuItemName.closeOtherTabs,
    ]);
  });
});
