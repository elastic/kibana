/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { FilterItem } from '../../filters_builder/filters_builder_utils';
import { FilterExpressionBadge } from './filter_badge_expression';

export interface FilterBadgeProps {
  filter: FilterItem;
}

export function FilterBadge({ filter }: FilterBadgeProps) {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      <EuiBadge
        style={{ cursor: 'pointer', padding: '5px' }}
        color="hollow"
        iconType="cross"
        iconSide="right"
      >
        <FilterExpressionBadge filter={filter} />
      </EuiBadge>
    </EuiFlexGroup>
  );
}
