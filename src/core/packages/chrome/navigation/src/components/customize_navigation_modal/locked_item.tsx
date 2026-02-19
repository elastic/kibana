/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSwitch,
} from '@elastic/eui';
import type { NavigationItemInfo } from '@kbn/core-chrome-browser';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const panelCss = css`
  padding-left: 0;
  padding-right: 0;
`;

const CORE_ITEM_IDS = new Set(['discover', 'dashboards']);

const CORE_LOCKED_ITEM_TOOLTIP = i18n.translate(
  'core.ui.chrome.sideNavigation.customizeNavigation.coreLockedItemTooltip',
  {
    defaultMessage: 'Discover and Dashboards are core items for all solutions',
  }
);

interface Props {
  item: NavigationItemInfo;
}

export const LockedItem = ({ item }: Props) => {
  const isCoreItem = CORE_ITEM_IDS.has(item.id);

  const tooltipContent = isCoreItem
    ? CORE_LOCKED_ITEM_TOOLTIP
    : i18n.translate('core.ui.chrome.sideNavigation.customizeNavigation.lockedItemTooltip', {
        defaultMessage: '{itemTitle} cannot be reordered or hidden',
        values: { itemTitle: item.title },
      });

  return (
    <EuiPanel key={item.id} paddingSize="s" hasShadow={false} disabled css={panelCss}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip type="lock" color="subdued" content={tooltipContent} position="left" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            compressed
            label={item.title}
            showLabel={true}
            checked={!item.hidden}
            onChange={() => {}}
            disabled
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
