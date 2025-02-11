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
import { EuiButtonIcon, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TabItem } from '../../types';

export interface TabProps {
  item: TabItem;
  isSelected?: boolean;
  'data-test-subj'?: string;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const Tab: React.FC<TabProps> = ({
  item,
  isSelected,
  'data-test-subj': dataTestSubj,
  onSelect,
  onClose,
}) => {
  return (
    <EuiFlexGroup data-test-subj={dataTestSubj} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton
          role="tab"
          aria-selected={isSelected}
          size="s"
          color={isSelected ? 'primary' : 'text'}
          onClick={isSelected ? undefined : () => onSelect(item)}
        >
          {item.label}
        </EuiButton>
      </EuiFlexItem>
      {isSelected && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
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
