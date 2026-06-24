/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { NotificationStackItem } from '../types';

export const TypeCell = ({ item }: { item: ContentListItem }) => {
  const { eventName, badgeColor } = item as NotificationStackItem;
  if (!eventName) return null;
  return <EuiBadge color={badgeColor ?? 'hollow'}>{eventName}</EuiBadge>;
};
