/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

export interface TabsState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const hasSingleTab = ({ items }: TabsState): boolean => {
  return items.length === 1;
};

export const isLastTab = ({ items }: TabsState, item: TabItem): boolean => {
  return items[items.length - 1].id === item.id;
};

export const addTab = (
  { items, selectedItem }: TabsState,
  item: TabItem,
  maxItemsCount: number | undefined
): TabsState => {
  if (maxItemsCount && items.length >= maxItemsCount) {
    return {
      items,
      selectedItem,
    };
  }

  return {
    items: [...items, item],
    selectedItem: item,
  };
};

export const selectTab = ({ items, selectedItem }: TabsState, item: TabItem): TabsState => {
  return {
    items,
    selectedItem: items.find((i) => i.id === item.id) || selectedItem,
  };
};

export const selectRecentlyClosedTab = (
  { items }: TabsState,
  nextSelectedItem: TabItem
): TabsState => {
  return {
    items: [...items, nextSelectedItem],
    selectedItem: nextSelectedItem,
  };
};

export const closeTab = ({ items, selectedItem }: TabsState, item: TabItem): TabsState => {
  const itemIndex = items.findIndex((i) => i.id === item.id);

  if (itemIndex === -1) {
    return {
      items,
      selectedItem,
    };
  }

  const nextItems = [...items];
  nextItems.splice(itemIndex, 1);

  if (selectedItem?.id !== item.id) {
    return {
      items: nextItems,
      selectedItem,
    };
  }

  const nextSelectedIndex = itemIndex === items.length - 1 ? itemIndex - 1 : itemIndex;
  const nextSelectedItem = nextItems[nextSelectedIndex] || null;

  return {
    items: nextItems,
    selectedItem: nextSelectedItem,
  };
};

export const insertTabAfter = (
  { items, selectedItem }: TabsState,
  item: TabItem,
  insertAfterItem: TabItem,
  maxItemsCount: number | undefined
): TabsState => {
  if (maxItemsCount && items.length >= maxItemsCount) {
    return {
      items,
      selectedItem,
    };
  }

  const insertAfterIndex = items.findIndex((i) => i.id === insertAfterItem.id);

  if (insertAfterIndex === -1) {
    return {
      items,
      selectedItem,
    };
  }

  const nextItems = [...items];
  const insertIndex = insertAfterIndex + 1;

  if (insertIndex === nextItems.length) {
    nextItems.push(item);
  } else {
    nextItems.splice(insertIndex, 0, item);
  }

  return {
    items: nextItems,
    selectedItem: item,
  };
};

export const replaceTabWith = (
  { items, selectedItem }: TabsState,
  item: TabItem,
  replaceWithItem: TabItem
): TabsState => {
  const itemIndex = items.findIndex((i) => i.id === item.id);

  if (itemIndex === -1) {
    return {
      items,
      selectedItem,
    };
  }

  const nextItems = [...items];
  nextItems[itemIndex] = replaceWithItem;

  return {
    items: nextItems,
    selectedItem: replaceWithItem,
  };
};

export const closeOtherTabs = (_: TabsState, item: TabItem): TabsState => {
  return {
    items: [item],
    selectedItem: item,
  };
};

export const closeTabsToTheRight = (
  { items, selectedItem }: TabsState,
  item: TabItem
): TabsState => {
  const itemIndex = items.findIndex((i) => i.id === item.id);
  const selectedTabIndex = selectedItem ? items.findIndex((i) => i.id === selectedItem.id) : -1;

  if (itemIndex === -1 || itemIndex === items.length - 1) {
    return {
      items,
      selectedItem,
    };
  }

  const nextItems = items.slice(0, itemIndex + 1);
  const isSelectedTabClosed = selectedTabIndex > itemIndex;

  return {
    items: nextItems,
    selectedItem: isSelectedTabClosed ? item : selectedItem,
  };
};
