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
import { useNotificationEventsService } from './notification_events_provider';

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
