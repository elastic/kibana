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

/** All notification events, ordered by insertion. */
export function useNotifications(): NotificationEvent[] {
  const events = useNotificationEventsService();
  const events$ = useMemo(() => events.get$(), [events]);
  return useObservable(events$, EMPTY);
}
