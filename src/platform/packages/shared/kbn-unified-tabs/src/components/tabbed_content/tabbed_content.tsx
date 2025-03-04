/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TabsBar } from '../tabs_bar';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import { getTabMenuActions } from '../../utils/get_tab_menu_actions';
import { addTab, removeTab, selectTab } from '../../utils/manage_tabs';
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
        setTimeout(() => onChanged(nextState), 0);
        return nextState;
      });
    },
    [_setState, onChanged]
  );

  const onSelect = useCallback(
    (item: TabItem) => {
      changeState((prevState) => selectTab(prevState, item));
    },
    [changeState]
  );

  const onClose = useCallback(
    (item: TabItem) => {
      changeState((prevState) => removeTab(prevState, item));
    },
    [changeState]
  );

  const onAdd = useCallback(() => {
    const newItem = createItem();
    changeState((prevState) => addTab(prevState, newItem));
  }, [changeState, createItem]);

  const getTabMenuItems = useMemo(() => {
    return getTabMenuActions({
      onDuplicate: (item) => alert(`Duplicate ${item.id}`),
      onCloseOtherTabs: (item) => alert(`Close other tabs ${item.id}`),
      onCloseTabsToTheRight: (item) => alert(`Close tabs to the right ${item.id}`),
    });
  }, []);

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
          getTabMenuItems={getTabMenuItems}
          onAdd={onAdd}
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
