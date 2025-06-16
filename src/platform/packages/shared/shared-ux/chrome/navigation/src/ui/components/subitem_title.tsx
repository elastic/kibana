/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SubItemBadge } from './subitem_badge';

export const SubItemTitle: React.FC<{
  item: ChromeProjectNavigationNode;
}> = ({ item: { title, withBadge, badgeOptions } }) => (
  <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
    <EuiFlexItem grow={!withBadge}>{title}</EuiFlexItem>
    {withBadge && (
      <EuiFlexItem>
        <SubItemBadge icon={badgeOptions?.icon} tooltip={badgeOptions?.tooltip} />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
