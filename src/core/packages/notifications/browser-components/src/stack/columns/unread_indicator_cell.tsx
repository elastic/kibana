/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import { NotificationEventReadIcon } from '../../events/notification_event_read_icon';
import type { NotificationStackItem } from '../types';

export const UnreadIndicatorCell = ({ item }: { item: ContentListItem }) => {
  const { id, title, isRead } = item as NotificationStackItem;
  return <NotificationEventReadIcon id={id} isRead={isRead} eventName={title} />;
};
