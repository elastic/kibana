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

/**
 * Production notification typeIds. Add yours here and ping @elastic/appex-sharedux
 * for review. Modeled on `SidebarAppId` in `@kbn/core-chrome-sidebar`: the const
 * list is the gate, so adding a new notification source shows up as a one-line
 * PR for the servicing team to review.
 */
export const VALID_NOTIFICATION_TYPE_IDS = [] as const;

/** Prefix carve-out for example / test typeIds — no PR review required. */
export const EXAMPLE_NOTIFICATION_TYPE_ID_PREFIX = 'notificationExample';

/**
 * The only typeIds the notifications API will accept. Production code must add
 * its typeId to `VALID_NOTIFICATION_TYPE_IDS`. Example / test code uses the
 * `notificationExample*` prefix without needing a PR.
 */
export type NotificationTypeId =
  | (typeof VALID_NOTIFICATION_TYPE_IDS)[number]
  | `${typeof EXAMPLE_NOTIFICATION_TYPE_ID_PREFIX}${string}`;

/**
 * Runtime validation for places that receive a typeId as a plain string (e.g.
 * a `notify()` payload from an untyped source).
 */
export function isValidNotificationTypeId(typeId: string): typeId is NotificationTypeId {
  if ((VALID_NOTIFICATION_TYPE_IDS as readonly string[]).includes(typeId)) return true;
  return typeId.startsWith(EXAMPLE_NOTIFICATION_TYPE_ID_PREFIX);
}

interface BaseNotificationEvent {
  /**
   * Unique id for the event. Publishers should namespace by their typeId
   * (`'notificationExampleReport:job-abc'`) so different sources can't
   * accidentally collide. `notify()` upserts by id.
   */
  id: string;
  timestamp: number;
  title: string;
  message: string;
  /** Default `false`. Hydrated from the persisted read-set at `notify()` time. */
  isRead: boolean;
  /** Default `false`. Hydrated from the persisted pin-set at `notify()` time. */
  isPinned?: boolean;
  /**
   * If set, persisted read/pin state is scoped to this space. If omitted, the
   * event is global. Core notifications does not validate that the space
   * exists — callers are responsible (or an upper-layer plugin wraps notify).
   */
  spaceId?: string;
  /**
   * Optional source identifier. When present, must satisfy {@link NotificationTypeId}.
   * Reserved for the upcoming "Mute notifications of this type" UX.
   */
  typeId?: NotificationTypeId;
}

export interface NotificationEventTypeData {
  severity: string;
  badgeColor?: EuiBadgeProps['color'];
  iconType?: IconType;
  eventName: string;
}

export interface TypedNotificationEvent<T> extends BaseNotificationEvent {
  typeId: NotificationTypeId;
  metadata?: T;
}

export type NotificationEvent = BaseNotificationEvent & NotificationEventTypeData;

export interface RegisteredNotificationEventType<T extends Record<string, string>>
  extends NotificationEventTypeData {
  typeId: NotificationTypeId;
  actionCallback?: <E extends TypedNotificationEvent<T>>(event: E) => void;
}

export interface INotificationEvents {
  /** Observable of the current events list, ordered by insertion. */
  get$: () => Observable<NotificationEvent[]>;

  /**
   * Register a notification type so events published with the same `typeId` can
   * share metadata (severity, icon, badge). The returned callback updates an
   * existing event with matching `id`.
   */
  registerType: <T>(
    typeId: NotificationTypeId,
    type: NotificationEventTypeData,
    actionCallback?: (event: TypedNotificationEvent<T>) => void
  ) => (event: TypedNotificationEvent<T>) => void;

  /**
   * Publish (or upsert by id) a notification event. The persisted read/pin
   * sets are consulted to hydrate `isRead` / `isPinned` before the event is
   * pushed to subscribers.
   */
  notify: (event: NotificationEvent) => void;

  /** Toggle the persisted read flag for `eventId`. */
  markAsRead: (eventId: string, isRead: boolean) => Promise<void>;

  /** Set the persisted pin flag for `eventId`. */
  pin: (eventId: string) => Promise<void>;
  /** Clear the persisted pin flag for `eventId`. */
  unpin: (eventId: string) => Promise<void>;

  /**
   * Reactive unread count. Maintained as a `BehaviorSubject` inside
   * `EventsService` and updated on every state transition that flips an
   * event's `isRead`. Use this for the global-header badge — it's O(1) per
   * render and only re-emits when the count actually changes.
   */
  getUnreadCount$: () => Observable<number>;
  /** Synchronous snapshot of the unread count. */
  getUnreadCount: () => number;
}
