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
  EuiIcon,
  EuiPanel,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NavigationItemInfo } from '../types';

interface Props {
  item: NavigationItemInfo;
}

const tooltipContent = i18n.translate('navigationCustomizationComponents.lockedItemTooltip', {
  defaultMessage: 'Can not be changed as it is a core item across all solutions',
});

export const LockedItem = ({ item }: Props) => {
  return (
    <EuiPanel key={item.id} paddingSize="s" hasShadow={false} disabled>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="lock" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        {item.icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={item.icon} aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltipContent} position="right">
            <EuiText tabIndex={0} size="s">
              {item.title}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate('navigationCustomizationComponents.lockedItemAriaLabel', {
              defaultMessage: '{title} cannot be changed',
              values: { title: item.title },
            })}
            showLabel={false}
            checked={!item.hidden}
            onChange={() => {}}
            disabled
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
