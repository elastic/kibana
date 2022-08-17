/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import React from 'react';
import { FilterExpressionBadge } from './filter_badge_expression';

export interface FilterBadgeProps {
  filter: Filter;
}

export function FilterBadge({ filter }: FilterBadgeProps) {
  return (
    <EuiFlexGroup gutterSize="none" alignItems="flexStart" responsive={false}>
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
