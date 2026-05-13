/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { NotificationEvent } from '@kbn/core-notifications-browser';
import { useNotificationEventsService } from '@kbn/core-notifications-browser-hooks';
import {
  contentListQueryClient,
  contentListKeys,
  type FindItemsFn,
  type FindItemsParams,
  type FindItemsResult,
  type ContentListItem,
} from '@kbn/content-list-provider';
import { NOTIFICATION_STACK_QUERY_KEY } from './constants';

/** Maps a `NotificationEvent` to a `ContentListItem` with notification-specific extra fields. */
const toStackItem = (event: NotificationEvent): ContentListItem => ({
  id: event.id,
  title: event.title,
  description: Array.isArray(event.message) ? event.message[0] : event.message,
  updatedAt: new Date(event.timestamp),
  // Notification-specific fields accessed via cast in column cells.
  isRead: event.isRead,
  isPinned: event.isPinned ?? false,
  severity: event.severity,
  badgeColor: event.badgeColor,
  iconType: event.iconType,
  eventName: event.eventName,
  typeId: event.typeId,
  spaceId: event.spaceId,
  timestamp: event.timestamp,
} as ContentListItem);

function applyParams(
  events: NotificationEvent[],
  { searchQuery, sort, page }: FindItemsParams
): FindItemsResult {
  let result = events;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter((e) => {
      const msg = Array.isArray(e.message) ? e.message[0] : e.message;
      return e.title.toLowerCase().includes(q) || msg.toLowerCase().includes(q);
    });
  }

  if (sort) {
    const { field, direction } = sort;
    const sign = direction === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (field === 'timestamp' || field === 'updatedAt') {
        return (a.timestamp - b.timestamp) * sign;
      }
      if (field === 'title') {
        return a.title.localeCompare(b.title) * sign;
      }
      return 0;
    });
  }

  const total = result.length;
  const { index, size } = page;
  const items = result.slice(index * size, (index + 1) * size).map(toStackItem);
  return { items, total };
}

/**
 * Returns a stable `findItems` function backed by the notification events observable.
 *
 * The events observable (`BehaviorSubject`) is subscribed synchronously during the
 * first render to pre-populate the snapshot ref, avoiding an empty-state flash on
 * initial load. A `useEffect` maintains a live subscription that invalidates the
 * React Query cache whenever the events list changes.
 */
export function useEventsFindItems(): FindItemsFn {
  const events = useNotificationEventsService();

  // Pre-populate synchronously from the BehaviorSubject's current value.
  const snapshotRef = useRef<NotificationEvent[] | null>(null);
  if (snapshotRef.current === null) {
    let initial: NotificationEvent[] = [];
    const sub = events.get$().subscribe((all) => {
      initial = all;
    });
    sub.unsubscribe();
    snapshotRef.current = initial;
  }

  // Keep the snapshot up to date and invalidate React Query on every change.
  useEffect(() => {
    const sub = events.get$().subscribe((all) => {
      snapshotRef.current = all;
      void contentListQueryClient.invalidateQueries({
        queryKey: contentListKeys.all(NOTIFICATION_STACK_QUERY_KEY),
      });
    });
    return () => sub.unsubscribe();
  }, [events]);

  return useCallback<FindItemsFn>(
    (params) => Promise.resolve(applyParams(snapshotRef.current!, params)),
    []
  );
}
