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
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { Tab } from '../tab';
import type { TabItem } from '../../types';

export interface TabsBarProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  tabContentId: string;
  onAdd: () => void;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  tabContentId,
  onAdd,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const addButtonLabel = i18n.translate('unifiedTabs.createTabButton', {
    defaultMessage: 'New',
  });

  return (
    <EuiFlexGroup
      role="tablist"
      data-test-subj="unifiedTabs_tabsBar"
      responsive={false}
      alignItems="center"
      gutterSize="none"
      className="eui-scrollBar"
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
        overflow-x: auto;
      `}
    >
      {items.map((item) => (
        <EuiFlexItem key={item.id} grow={false}>
          <Tab
            item={item}
            isSelected={selectedItem?.id === item.id}
            tabContentId={tabContentId}
            onSelect={onSelect}
            onClose={onClose}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_newTabBtn"
          iconType="plus"
          color="text"
          css={css`
            margin-inline: ${euiTheme.size.s};
          `}
          aria-label={addButtonLabel}
          title={addButtonLabel}
          onClick={onAdd}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
