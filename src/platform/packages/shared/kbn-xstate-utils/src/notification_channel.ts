/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject, Subject } from 'rxjs';
import { ActionFunction, EventObject, Expr, Subscribable } from 'xstate';

export interface NotificationChannel<TContext, TEvent extends EventObject, TSentEvent> {
  createService: () => Subscribable<TSentEvent>;
  notify: (
    eventExpr: Expr<TContext, TEvent, TSentEvent | undefined>
  ) => ActionFunction<TContext, TEvent>;
}

export const createNotificationChannel = <TContext, TEvent extends EventObject, TSentEvent>(
  shouldReplayLastEvent = true
): NotificationChannel<TContext, TEvent, TSentEvent> => {
  const eventsSubject = shouldReplayLastEvent
    ? new ReplaySubject<TSentEvent>(1)
    : new Subject<TSentEvent>();

  const createService = () => eventsSubject.asObservable();

  const notify =
    (eventExpr: Expr<TContext, TEvent, TSentEvent | undefined>) =>
    (context: TContext, event: TEvent) => {
      const eventToSend = eventExpr(context, event);

      if (eventToSend != null) {
        eventsSubject.next(eventToSend);
      }
    };

  return {
    createService,
    notify,
  };
};
