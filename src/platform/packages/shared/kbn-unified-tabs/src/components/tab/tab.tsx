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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { getTabAttributes } from '../../utils/get_tab_attributes';
import type { TabItem } from '../../types';

export interface TabProps {
  item: TabItem;
  isSelected: boolean;
  tabContentId: string;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const Tab: React.FC<TabProps> = ({ item, isSelected, tabContentId, onSelect, onClose }) => {
  return (
    <EuiFlexGroup
      data-test-subj={`unifiedTabs_tab_${item.id}`}
      responsive={false}
      alignItems="center"
    >
      <EuiFlexItem grow={false}>
        <button
          {...getTabAttributes(item, tabContentId)}
          data-test-subj={`unifiedTabs_selectTabBtn_${item.id}`}
          role="tab"
          type="button"
          aria-selected={isSelected}
          tabIndex={isSelected ? 0 : -1}
          onClick={isSelected ? undefined : () => onSelect(item)}
        >
          <EuiText color={isSelected ? 'default' : 'subdued'}>{item.label}</EuiText>
        </button>
      </EuiFlexItem>
      {isSelected && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj={`unifiedTabs_closeTabBtn_${item.id}`}
            iconType="cross"
            color="text"
            title={i18n.translate('unifiedTabs.closeTabButton', {
              defaultMessage: 'Close',
            })}
            onClick={() => {
              onClose(item);
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
