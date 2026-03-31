/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadgeGroup } from '@elastic/eui';
import React from 'react';
import { NoValueBadge } from './no_value_badge';

interface BadgeGroupProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  isNoValue?: (item: T) => boolean;
}

export const BadgeGroup = <T,>({ items, renderItem, isNoValue }: BadgeGroupProps<T>) => {
  if (!items?.length) {
    return (
      <EuiBadgeGroup gutterSize="xs">
        <NoValueBadge />
      </EuiBadgeGroup>
    );
  }

  return (
    <EuiBadgeGroup gutterSize="xs">
      {items.map((item, index) =>
        isNoValue?.(item) ? <NoValueBadge key={`no-value-${index}`} /> : renderItem(item, index)
      )}
    </EuiBadgeGroup>
  );
};
