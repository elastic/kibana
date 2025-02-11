/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tab } from '../tab';
import type { TabItem } from '../../types';

let TMP_COUNTER = 0;

export interface TabsBarProps {
  initialItems: TabItem[];
  initialSelectedItemId?: string;
  'data-test-subj'?: string;
  onSelected?: (item: TabItem) => void;
  onClosed?: (item: TabItem) => void;
}

export interface TabsBarState {
  items: TabItem[];
  selectedItem: TabItem | null;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  initialItems,
  initialSelectedItemId,
  'data-test-subj': dataTestSubj,
  onSelected,
  onClosed,
}) => {
  const [state, setState] = useState<TabsBarState>(() => {
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
            : prevState.items[prevState.items.length - 1] || null,
      }));
      onClosed?.(item);
    },
    [setState, onClosed]
  );

  const onAdd = useCallback(() => {
    setState((prevState) => {
      const nextName = TMP_COUNTER++;
      return {
        items: [
          ...prevState.items,
          {
            id: `tab-${nextName}`,
            label: `Undefined ${nextName}`,
          },
        ],
        selectedItem: prevState.selectedItem,
      };
    });
  }, [setState]);

  return (
    <EuiFlexGroup role="tablist" data-test-subj={dataTestSubj} responsive={false}>
      {items.map((item) => (
        <EuiFlexItem key={item.id} grow={false}>
          <Tab
            item={item}
            isSelected={selectedItem?.id === item.id}
            data-test-subj={`${dataTestSubj || 'unifiedTabsBar'}_tab_${item.id}`}
            onSelect={onSelect}
            onClose={onClose}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="listAdd"
          title={i18n.translate('unifiedTabs.createTabButton', {
            defaultMessage: 'New',
          })}
          onClick={onAdd}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
