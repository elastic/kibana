/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { NotificationStackItem } from '../types';

const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60)
    return i18n.translate('core.notifications.stack.columns.received.justNow', {
      defaultMessage: 'just now',
    });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return i18n.translate('core.notifications.stack.columns.received.minutesAgo', {
      defaultMessage: '{minutes}m ago',
      values: { minutes },
    });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return i18n.translate('core.notifications.stack.columns.received.hoursAgo', {
      defaultMessage: '{hours}h ago',
      values: { hours },
    });
  const days = Math.floor(hours / 24);
  return i18n.translate('core.notifications.stack.columns.received.daysAgo', {
    defaultMessage: '{days}d ago',
    values: { days },
  });
};

export const ReceivedCell = ({ item }: { item: ContentListItem }) => {
  const { timestamp } = item as NotificationStackItem;
  return (
    <EuiText size="s" color="subdued">
      {formatRelativeTime(timestamp)}
    </EuiText>
  );
};
