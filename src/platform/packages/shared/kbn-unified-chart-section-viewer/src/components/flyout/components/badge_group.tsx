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
  items: T[] | undefined;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export const BadgeGroup = <T,>({ items, renderItem }: BadgeGroupProps<T>) => (
  <EuiBadgeGroup gutterSize="xs">
    {items?.length ? items.map(renderItem) : <NoValueBadge />}
  </EuiBadgeGroup>
);
