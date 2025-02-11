/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { TabsBar } from '../tabs_bar';
import { TabItem } from '../../types';

let TMP_COUNTER = 0;

export interface TabbedContentProps {
  initialItems: TabItem[];
  initialSelectedItemId?: string;
  'data-test-subj'?: string;
  renderContent: (selectedItem: TabItem) => React.ReactNode;
  onAdded?: (item: TabItem) => void;
  onSelected?: (item: TabItem) => void;
  onClosed?: (item: TabItem) => void;
}

export interface TabbedContentState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  initialItems,
  initialSelectedItemId,
  renderContent,
  onAdded,
  onSelected,
  onClosed,
}) => {
  const [state, setState] = useState<TabbedContentState>(() => {
    return {
      items: initialItems,
      selectedItem:
        (initialSelectedItemId && initialItems.find((item) => item.id === initialSelectedItemId)) ||
        initialItems[0],
    };
  });
  const { items, selectedItem } = state;

  const onSelect = useCallback(
    (item: TabItem) => {
      setState((prevState) => ({
        ...prevState,
        selectedItem: item,
      }));
      onSelected?.(item);
    },
    [setState, onSelected]
  );

  const onClose = useCallback(
    (item: TabItem) => {
      setState((prevState) => ({
        items: prevState.items.filter((prevItem) => prevItem.id !== item.id),
        selectedItem:
          prevState.selectedItem?.id !== item.id
            ? prevState.selectedItem
            : prevState.items[prevState.items.length - 2] || null,
      }));
      onClosed?.(item);
    },
    [setState, onClosed]
  );

  const onAdd = useCallback(() => {
    const nextName = TMP_COUNTER++;
    const newItem = {
      id: `tab-${nextName}`,
      label: `Undefined ${nextName}`,
    };
    setState((prevState) => {
      return {
        items: [...prevState.items, newItem],
        selectedItem: newItem,
      };
    });
    onAdded?.(newItem);
  }, [setState, onAdded]);

  return (
    <>
      <TabsBar
        items={items}
        selectedItem={selectedItem}
        onAdd={onAdd}
        onSelect={onSelect}
        onClose={onClose}
      />
      {selectedItem ? renderContent(selectedItem) : null}
    </>
  );
};
