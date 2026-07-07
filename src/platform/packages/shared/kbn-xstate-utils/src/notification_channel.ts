/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject, Subject } from 'rxjs';
import type { EventObject, Subscribable } from 'xstate';

/**
 * Expression function type - takes context and event, returns a result.
 * Updated for XState v5: receives destructured args object.
 */
type ExpressionFunction<TContext, TEvent extends EventObject, TResult> = (args: {
  context: TContext;
  event: TEvent;
}) => TResult;

/**
 * Simple action function type for notification channel.
 * Updated for XState v5: receives destructured args object.
 */
type NotificationAction<TContext, TEvent extends EventObject> = (args: {
  context: TContext;
  event: TEvent;
}) => void;

export interface NotificationChannel<TContext, TEvent extends EventObject, TSentEvent> {
  createService: () => Subscribable<TSentEvent>;
  notify: (
    eventExpr: ExpressionFunction<TContext, TEvent, TSentEvent | undefined>
  ) => NotificationAction<TContext, TEvent>;
}

export const createNotificationChannel = <TContext, TEvent extends EventObject, TSentEvent>(
  shouldReplayLastEvent = true
): NotificationChannel<TContext, TEvent, TSentEvent> => {
  const eventsSubject = shouldReplayLastEvent
    ? new ReplaySubject<TSentEvent>(1)
    : new Subject<TSentEvent>();

  const createService = () => eventsSubject.asObservable();

  const notify =
    (
      eventExpr: ExpressionFunction<TContext, TEvent, TSentEvent | undefined>
    ): NotificationAction<TContext, TEvent> =>
    ({ context, event }) => {
      const eventToSend = eventExpr({ context, event });

      if (eventToSend != null) {
        eventsSubject.next(eventToSend);
      }
    };

  return {
    createService,
    notify,
  };
};
