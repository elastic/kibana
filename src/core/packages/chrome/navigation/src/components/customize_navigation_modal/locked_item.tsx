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
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { NavigationItemInfo } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

const LOCKED_ITEM_TOOLTIP = i18n.translate(
  'core.ui.chrome.sideNavigation.customizeNavigation.lockedItemTooltip',
  {
    defaultMessage: 'Discover and Dashboards are core items for all solutions',
  }
);

interface Props {
  item: NavigationItemInfo;
}

export const LockedItem = ({ item }: Props) => (
  <EuiPanel key={item.id} paddingSize="s" hasShadow={false} disabled>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip type="lock" color="subdued" content={LOCKED_ITEM_TOOLTIP} position="left" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={`visibility-${item.id}`}
          checked={!item.hidden}
          onChange={() => {}}
          aria-label={i18n.translate(
            'core.ui.chrome.sideNavigation.customizeNavigation.lockedItemAriaLabel',
            {
              defaultMessage: '{itemTitle} is a core item and cannot be hidden',
              values: { itemTitle: item.title },
            }
          )}
          disabled
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{item.title}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
