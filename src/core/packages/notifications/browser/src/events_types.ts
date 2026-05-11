/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { EuiBadgeProps, IconType } from '@elastic/eui';

interface BaseNotificationEvent {
  id: string;
  timestamp: number;
  title: string;
  message: string;
  isRead: boolean;
}

export interface NotificationEventTypeData {
  severity: string;
  badgeColor?: EuiBadgeProps['color'];
  iconType?: IconType;
  eventName: string;
}

export interface TypedNotificationEvent<T> extends BaseNotificationEvent {
  typeId: string;
  metadata?: T;
}

export type NotificationEvent = BaseNotificationEvent & NotificationEventTypeData;

export interface RegisteredNotificationEventType<T extends Record<string, string>>
  extends NotificationEventTypeData {
  typeId: string;
  actionCallback?: <E extends TypedNotificationEvent<T>>(event: E) => void;
}

export interface INotificationEvents {
  get$: () => Observable<NotificationEvent[]>;
  registerType: <T>(
    typeId: string,
    type: NotificationEventTypeData,
    actionCallback?: (event: TypedNotificationEvent<T>) => void
  ) => (event: TypedNotificationEvent<T>) => void;
  notify: (event: NotificationEvent) => void;
  markAsRead: (eventId: string, isRead: boolean) => void;
}
