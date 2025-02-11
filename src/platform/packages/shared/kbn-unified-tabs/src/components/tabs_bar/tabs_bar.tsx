/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tab } from '../tab';
import type { TabItem } from '../../types';

export interface TabsBarProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  'data-test-subj'?: string;
  onAdd: () => void;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  'data-test-subj': dataTestSubj,
  onAdd,
  onSelect,
  onClose,
}) => {
  return (
    <EuiFlexGroup
      role="tablist"
      data-test-subj={dataTestSubj}
      responsive={false}
      alignItems="center"
    >
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
          iconType="plus"
          color="text"
          title={i18n.translate('unifiedTabs.createTabButton', {
            defaultMessage: 'New',
          })}
          onClick={onAdd}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
