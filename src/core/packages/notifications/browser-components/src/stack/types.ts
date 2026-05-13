/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBadgeProps } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * A `ContentListItem` shaped to carry the notification-specific fields that
 * the stack table's column cells need. The adapter (`useEventsFindItems`)
 * maps `NotificationEvent` values to these fields before passing items to
 * `ContentListProvider`.
 */
export type NotificationStackItem = ContentListItem<{
  isRead: boolean;
  isPinned: boolean;
  severity: string;
  badgeColor?: EuiBadgeProps['color'];
  iconType?: string;
  eventName: string;
  typeId?: string;
  spaceId?: string;
  timestamp: number;
}>;
