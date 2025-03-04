/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

interface TabsState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const addTab = ({ items }: TabsState, item: TabItem): TabsState => {
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

  if (itemIndex === -1 || itemIndex === items.length - 1) {
    return {
      items,
      selectedItem,
    };
  }

  const nextItems = items.slice(0, itemIndex + 1);

  return {
    items: nextItems,
    selectedItem,
  };
};
