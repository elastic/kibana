/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import { TabsBar } from '../tabs_bar';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import { TabItem } from '../../types';

export interface TabbedContentProps {
  initialItems: TabItem[];
  initialSelectedItemId?: string;
  'data-test-subj'?: string;
  renderContent: (selectedItem: TabItem) => React.ReactNode;
  createItem: () => TabItem;
  onChanged: (state: TabbedContentState) => void;
}

export interface TabbedContentState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  initialItems,
  initialSelectedItemId,
  renderContent,
  createItem,
  onChanged,
}) => {
  const [tabContentId] = useState(() => htmlIdGenerator()());
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
    },
    [setState]
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
    },
    [setState]
  );

  const onAdd = useCallback(() => {
    const newItem = createItem();
    setState((prevState) => {
      return {
        items: [...prevState.items, newItem],
        selectedItem: newItem,
      };
    });
  }, [setState, createItem]);

  useEffect(() => {
    onChanged(state);
  }, [state, onChanged]);

  return (
    <>
      <TabsBar
        items={items}
        selectedItem={selectedItem}
        tabContentId={tabContentId}
        onAdd={onAdd}
        onSelect={onSelect}
        onClose={onClose}
      />
      {selectedItem ? (
        <div
          data-test-subj="unifiedTabs_selectedTabContent"
          role="tabpanel"
          id={tabContentId}
          aria-labelledby={getTabAttributes(selectedItem, tabContentId).id}
        >
          {renderContent(selectedItem)}
        </div>
      ) : null}
    </>
  );
};
