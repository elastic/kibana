/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  const [state, _setState] = useState<TabbedContentState>(() => {
    return {
      items: initialItems,
      selectedItem:
        (initialSelectedItemId && initialItems.find((item) => item.id === initialSelectedItemId)) ||
        initialItems[0],
    };
  });
  const { items, selectedItem } = state;

  const changeState = useCallback(
    (getNextState: (prevState: TabbedContentState) => TabbedContentState) => {
      _setState((prevState) => {
        const nextState = getNextState(prevState);
        onChanged(nextState);
        return nextState;
      });
    },
    [_setState, onChanged]
  );

  const onReorder = useCallback(
    (reorderedItems: TabItem[]) => {
      changeState((prevState) => ({
        ...prevState,
        items: reorderedItems,
      }));
    },
    [changeState]
  );

  const onSelect = useCallback(
    (item: TabItem) => {
      changeState((prevState) => ({
        ...prevState,
        selectedItem: item,
      }));
    },
    [changeState]
  );

  const onClose = useCallback(
    (item: TabItem) => {
      changeState((prevState) => {
        const nextItems = prevState.items.filter((prevItem) => prevItem.id !== item.id);
        // TODO: better selection logic
        const nextSelectedItem = nextItems.length ? nextItems[nextItems.length - 1] : null;

        return {
          items: nextItems,
          selectedItem:
            prevState.selectedItem?.id !== item.id ? prevState.selectedItem : nextSelectedItem,
        };
      });
    },
    [changeState]
  );

  const onAdd = useCallback(() => {
    const newItem = createItem();
    changeState((prevState) => {
      return {
        items: [...prevState.items, newItem],
        selectedItem: newItem,
      };
    });
  }, [changeState, createItem]);

  return (
    <EuiFlexGroup
      responsive={false}
      direction="column"
      gutterSize="none"
      className="eui-fullHeight"
    >
      <EuiFlexItem grow={false}>
        <TabsBar
          items={items}
          selectedItem={selectedItem}
          tabContentId={tabContentId}
          onAdd={onAdd}
          onReorder={onReorder}
          onSelect={onSelect}
          onClose={onClose}
        />
      </EuiFlexItem>
      {selectedItem ? (
        <EuiFlexItem
          data-test-subj="unifiedTabs_selectedTabContent"
          role="tabpanel"
          id={tabContentId}
          aria-labelledby={getTabAttributes(selectedItem, tabContentId).id}
        >
          {renderContent(selectedItem)}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
