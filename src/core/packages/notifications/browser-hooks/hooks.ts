/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useObservable } from '@kbn/use-observable';
import type { NotificationEvent } from '@kbn/core-notifications-browser';
import { useNotificationEventsService } from './notification_events_provider';

const EMPTY: NotificationEvent[] = [];

/**
 * All notification events, sorted pinned-first then by descending timestamp.
 *
 * Sort lives in this hook (rather than EventsService) so consumers that
 * want a different order can build their own selector on top of the raw
 * `events.get$()` observable.
 */
export function useNotifications(): NotificationEvent[] {
  const events = useNotificationEventsService();
  const events$ = useMemo(() => events.get$(), [events]);
  const raw = useObservable(events$, EMPTY);
  return useMemo(() => {
    if (raw.length === 0) return raw;
    return [...raw].sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // pinned first
      return b.timestamp - a.timestamp; // newest first
    });
  }, [raw]);
}

/** Notification events the user has not yet marked as read. */
export function useUnreadNotifications(): NotificationEvent[] {
  const all = useNotifications();
  return useMemo(() => all.filter((e) => !e.isRead), [all]);
}

/** Notification events the user has already marked as read. */
export function useReadNotifications(): NotificationEvent[] {
  const all = useNotifications();
  return useMemo(() => all.filter((e) => e.isRead), [all]);
}

/** Notification events the user has pinned. */
export function usePinnedNotifications(): NotificationEvent[] {
  const all = useNotifications();
  return useMemo(() => all.filter((e) => e.isPinned), [all]);
}

/**
 * Reactive unread count.
 *
 * Subscribes to the dedicated `getUnreadCount$()` observable on
 * `INotificationEvents` — O(1) per render, only re-renders when the count
 * actually changes. Designed for the global-header notification badge,
 * which mounts for the page session and must not iterate the full events
 * list on every render.
 */
export function useUnreadNotificationCount(): number {
  const events = useNotificationEventsService();
  const count$ = useMemo(() => events.getUnreadCount$(), [events]);
  return useObservable(count$, events.getUnreadCount());
}
