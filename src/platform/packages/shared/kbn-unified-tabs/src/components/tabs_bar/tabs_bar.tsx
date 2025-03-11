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
import { Tab, type TabProps } from '../tab';
import type { TabItem } from '../../types';

export type TabsBarProps = Pick<
  TabProps,
  'getTabMenuItems' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId'
> & {
  items: TabItem[];
  selectedItem: TabItem | null;
  onAdd: () => Promise<void>;
};

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  tabContentId,
  getTabMenuItems,
  onAdd,
  onLabelEdited,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const addButtonLabel = i18n.translate('unifiedTabs.createTabButton', {
    defaultMessage: 'New session',
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
            getTabMenuItems={getTabMenuItems}
            onLabelEdited={onLabelEdited}
            onSelect={onSelect}
            onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
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
