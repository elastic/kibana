/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { escapeRegExp } from 'lodash';
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
import { getNextTabNumber } from '../../utils/get_next_tab_number';
import { MAX_ITEMS_COUNT } from '../../constants';

export interface TabbedContentProps extends Pick<TabsBarProps, 'maxItemsCount'> {
  items: TabItem[];
  selectedItemId?: string;
  recentlyClosedItems: TabItem[];
  'data-test-subj'?: string;
  services: TabsServices;
  hideTabsBar?: boolean;
  renderContent: (selectedItem: TabItem) => React.ReactNode;
  createItem: () => TabItem;
  onChanged: (state: TabbedContentState) => void;
  getPreviewData: (item: TabItem) => TabPreviewData;
  onEvent: (eventName: string, payload?: any) => void; // TODO better type for payload
}

export interface TabbedContentState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const TabbedContent: React.FC<TabbedContentProps> = ({
  items: managedItems,
  selectedItemId: managedSelectedItemId,
  recentlyClosedItems,
  maxItemsCount = MAX_ITEMS_COUNT,
  services,
  hideTabsBar = false,
  renderContent,
  createItem,
  onChanged,
  getPreviewData,
  onEvent,
}) => {
  const tabsBarApi = useRef<TabsBarApi | null>(null);
  const [tabContentId] = useState(() => htmlIdGenerator()());
  const state = useMemo(
    () => prepareStateFromProps(managedItems, managedSelectedItemId),
    [managedItems, managedSelectedItemId]
  );
  const { items, selectedItem } = state;
  const stateRef = React.useRef<TabbedContentState>();
  stateRef.current = state;

  const changeState = useCallback(
    (getNextState: (prevState: TabbedContentState) => TabbedContentState) => {
      if (!stateRef.current) {
        return;
      }

      const nextState = getNextState(stateRef.current);
      onChanged(nextState);
    },
    [onChanged]
  );

  const onLabelEdited = useCallback(
    async (item: TabItem, newLabel: string) => {
      const editedItem = { ...item, label: newLabel };
      tabsBarApi.current?.moveFocusToNextSelectedItem(editedItem);
      changeState((prevState) => replaceTabWith(prevState, item, editedItem));

      onEvent('tabRenamed');
    },
    [changeState, onEvent]
  );

  const onSelect = useCallback(
    async (item: TabItem) => {
      changeState((prevState) => selectTab(prevState, item));
      onEvent('tabSwitched');
    },
    [changeState, onEvent]
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

        onEvent('tabClosed', {
          totalTabsOpen: prevState.items.length,
          remainingTabsCount: nextState.items.length,
          tabId: item.id,
        });

        return nextState;
      });
    },
    [changeState, onEvent]
  );

  const onReorder = useCallback(
    (reorderedItems: TabItem[]) => {
      changeState((prevState) => {
        const prevItems = prevState.items;
        const movedItem = prevItems.find((item, index) => item.id !== reorderedItems[index]?.id);
        const nextState = { ...prevState, items: reorderedItems };

        if (!movedItem) {
          return nextState;
        }

        const fromIndex = prevItems.findIndex((item) => item.id === movedItem.id);
        const toIndex = reorderedItems.findIndex((item) => item.id === movedItem.id);

        onEvent('tabReordered', {
          fromIndex,
          toIndex,
          totalTabsOpen: prevState.items.length,
          tabId: movedItem.id,
        });

        return nextState;
      });
    },
    [changeState, onEvent]
  );

  const onAdd = useCallback(async () => {
    const newItem = createItem();
    tabsBarApi.current?.moveFocusToNextSelectedItem(newItem);
    changeState((prevState) => {
      const nextState = addTab(prevState, newItem, maxItemsCount);

      onEvent('tabCreated', {
        totalTabsOpen: prevState.items.length,
        tabId: newItem.id,
      });

      return nextState;
    });
  }, [changeState, createItem, maxItemsCount, onEvent]);

  const onDuplicate = useCallback(
    (item: TabItem) => {
      const newItem = createItem();
      newItem.duplicatedFromId = item.id;

      const copyLabel = i18n.translate('unifiedTabs.copyLabel', { defaultMessage: 'copy' });

      // Remove existing (copy) or (copy N) suffix to get base label
      const copyPattern = `\\s*\\(${escapeRegExp(copyLabel)}\\)(?:\\s+\\d+)?$`;
      const baseLabel = item.label.replace(new RegExp(copyPattern), '');

      // Create the copy base pattern: "Original Label (copy)"
      const copyBaseLabel = `${baseLabel} (${copyLabel})`;

      const nextNumber = getNextTabNumber(state.items, copyBaseLabel);
      newItem.label = nextNumber ? `${copyBaseLabel} ${nextNumber}` : copyBaseLabel;

      tabsBarApi.current?.moveFocusToNextSelectedItem(newItem);
      changeState((prevState) => insertTabAfter(prevState, newItem, item, maxItemsCount));

      onEvent('tabDuplicated');
    },
    [changeState, createItem, maxItemsCount, state.items, onEvent]
  );

  const onCloseOtherTabs = useCallback(
    (item: TabItem) => {
      changeState((prevState) => closeOtherTabs(prevState, item));
      onEvent('tabClosedOthers');
    },
    [changeState, onEvent]
  );

  const getTabMenuItems = useMemo(() => {
    return getTabMenuItemsFn({
      tabsState: state,
      maxItemsCount,
      onDuplicate,
      onCloseOtherTabs,
      onCloseTabsToTheRight: (item) =>
        changeState((prevState) => closeTabsToTheRight(prevState, item)),
    });
  }, [state, maxItemsCount, onDuplicate, onCloseOtherTabs, changeState]);

  return (
    <EuiFlexGroup
      responsive={false}
      direction="column"
      gutterSize="none"
      className="eui-fullHeight"
    >
      {!hideTabsBar && (
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
            onEvent={onEvent}
          />
        </EuiFlexItem>
      )}
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

function prepareStateFromProps(items: TabItem[], selectedItemId?: string): TabbedContentState {
  const selectedItem = selectedItemId && items.find((item) => item.id === selectedItemId);
  return {
    items,
    selectedItem: selectedItem || items[0],
  };
}
