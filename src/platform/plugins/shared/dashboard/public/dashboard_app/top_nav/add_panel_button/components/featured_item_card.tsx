/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';

import type { MenuItem } from '../types';

interface FeaturedItemCardProps {
  item: MenuItem;
  /** Optional title override; defaults to the item name. */
  title?: string;
  /** Optional description override; defaults to the item description. */
  description?: string;
  className?: string;
}

export const FeaturedItemCard = ({
  item,
  title,
  description,
  className,
}: FeaturedItemCardProps) => (
  <EuiPanel
    element="button"
    hasBorder
    paddingSize="none"
    onClick={item.onClick}
    className={className}
    data-test-subj={item['data-test-subj']}
  >
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={item.icon} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong className="featuredPanelItem__title">{title ?? item.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {description ?? item.description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
