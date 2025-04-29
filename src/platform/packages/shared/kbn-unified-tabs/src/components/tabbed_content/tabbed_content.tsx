/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TabsBar, type TabsBarProps, type TabsBarApi } from '../tabs_bar';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import { getTabMenuItemsFn } from '../../utils/get_tab_menu_items';
import {
  addTab,
  closeTab,
  selectTab,
  selectRecentlyClosedTab,
  insertTabAfter,
  replaceTabWith,
  closeOtherTabs,
  closeTabsToTheRight,
} from '../../utils/manage_tabs';
import type { TabItem, TabsServices, TabPreviewData } from '../../types';

export interface TabbedContentProps extends Pick<TabsBarProps, 'maxItemsCount'> {
  initialItems: TabItem[];
  initialSelectedItemId?: string;
  recentlyClosedItems: TabItem[];
  'data-test-subj'?: string;
  services: TabsServices;
  renderContent: (selectedItem: TabItem) => React.ReactNode;
  createItem: () => TabItem;
  onChanged: (state: TabbedContentState) => void;
  getPreviewData: (item: TabItem) => TabPreviewData;
}

export interface TabbedContentState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  initialItems,
  initialSelectedItemId,
  recentlyClosedItems,
  maxItemsCount,
  services,
  renderContent,
  createItem,
  onChanged,
  getPreviewData,
}) => {
  const tabsBarApi = useRef<TabsBarApi | null>(null);
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
  const stateRef = React.useRef<TabbedContentState>();
  stateRef.current = state;

  const changeState = useCallback(
    (getNextState: (prevState: TabbedContentState) => TabbedContentState) => {
      if (!stateRef.current) {
        return;
      }

      const nextState = getNextState(stateRef.current);
      _setState(nextState);
      onChanged(nextState);
    },
    [_setState, onChanged]
  );

  const onLabelEdited = useCallback(
    async (item: TabItem, newLabel: string) => {
      const editedItem = { ...item, label: newLabel };
      tabsBarApi.current?.moveFocusToNextSelectedItem(editedItem);
      changeState((prevState) => replaceTabWith(prevState, item, editedItem));
    },
    [changeState]
  );

  const onSelect = useCallback(
    async (item: TabItem) => {
      changeState((prevState) => selectTab(prevState, item));
    },
    [changeState]
  );

  const onSelectRecentlyClosed = useCallback(
    async (item: TabItem) => {
      changeState((prevState) => selectRecentlyClosedTab(prevState, item));
    },
    [changeState]
  );

  const onClose = useCallback(
    async (item: TabItem) => {
      changeState((prevState) => {
        const nextState = closeTab(prevState, item);
        if (nextState.selectedItem) {
          tabsBarApi.current?.moveFocusToNextSelectedItem(nextState.selectedItem);
        }
        return nextState;
      });
    },
    [changeState]
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

  const onAdd = useCallback(async () => {
    const newItem = createItem();
    tabsBarApi.current?.moveFocusToNextSelectedItem(newItem);
    changeState((prevState) => addTab(prevState, newItem, maxItemsCount));
  }, [changeState, createItem, maxItemsCount]);

  const getTabMenuItems = useMemo(() => {
    return getTabMenuItemsFn({
      tabsState: state,
      maxItemsCount,
      onDuplicate: (item) => {
        const newItem = createItem();
        const copyLabel = i18n.translate('unifiedTabs.copyLabel', { defaultMessage: 'copy' });
        const baseRegex = new RegExp(`\\s*\\(${copyLabel}\\)( \\d+)?$`);
        const baseLabel = item.label.replace(baseRegex, '');

        // Find all existing copies to determine next number
        const copyRegex = new RegExp(`^${baseLabel}\\s*\\(${copyLabel}\\)( \\d+)?$`);
        const copyNumberRegex = new RegExp(`\\(${copyLabel}\\) (\\d+)$`);
        const copies = state.items
          .filter((tab) => copyRegex.test(tab.label))
          .map((tab) => {
            const match = tab.label.match(copyNumberRegex);
            return match && match[1] ? Number(match[1]) : 1; // match[1] is the number after (copy)
          });

        // Determine the next copy number
        const nextNumber = copies.length > 0 ? Math.max(...copies) + 1 : null;

        newItem.label = nextNumber
          ? `${baseLabel} (${copyLabel}) ${nextNumber}`
          : `${baseLabel} (${copyLabel})`;

        tabsBarApi.current?.moveFocusToNextSelectedItem(newItem);
        changeState((prevState) => insertTabAfter(prevState, newItem, item, maxItemsCount));
      },
      onCloseOtherTabs: (item) => changeState((prevState) => closeOtherTabs(prevState, item)),
      onCloseTabsToTheRight: (item) =>
        changeState((prevState) => closeTabsToTheRight(prevState, item)),
    });
  }, [changeState, createItem, state, maxItemsCount]);

  return (
    <EuiFlexGroup
      responsive={false}
      direction="column"
      gutterSize="none"
      className="eui-fullHeight"
    >
      <EuiFlexItem grow={false}>
        <TabsBar
          ref={tabsBarApi}
          items={items}
          selectedItem={selectedItem}
          recentlyClosedItems={recentlyClosedItems}
          maxItemsCount={maxItemsCount}
          tabContentId={tabContentId}
          getTabMenuItems={getTabMenuItems}
          services={services}
          onAdd={onAdd}
          onLabelEdited={onLabelEdited}
          onSelect={onSelect}
          onSelectRecentlyClosed={onSelectRecentlyClosed}
          onReorder={onReorder}
          onClose={onClose}
          getPreviewData={getPreviewData}
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
