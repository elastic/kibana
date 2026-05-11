/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type {
  INotificationEvents,
  NotificationEvent,
  NotificationEventTypeData,
  TypedNotificationEvent,
} from '@kbn/core-notifications-browser';

interface RegisteredType extends NotificationEventTypeData {
  typeId: string;
  callback: (event: TypedNotificationEvent<unknown>) => void;
}

export class EventsService implements INotificationEvents {
  private readonly events$ = new BehaviorSubject<NotificationEvent[]>([]);
  private readonly types$ = new BehaviorSubject<RegisteredType[]>([]);

  public start(): INotificationEvents {
    return this;
  }

  public get$() {
    return this.events$.asObservable();
  }

  public notify(event: NotificationEvent) {
    this.events$.next([...this.events$.getValue(), event]);
  }

  public markAsRead(eventId: string, isRead: boolean) {
    const events = this.events$.getValue();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return;
    const next = events.slice();
    next[index] = { ...next[index], isRead };
    this.events$.next(next);
  }

  public registerType<T>(
    typeId: string,
    type: NotificationEventTypeData,
    actionCallback?: (event: TypedNotificationEvent<T>) => void
  ): (event: TypedNotificationEvent<T>) => void {
    const existing = this.types$.getValue().find((t) => t.typeId === typeId);
    if (existing) {
      return existing.callback as (event: TypedNotificationEvent<T>) => void;
    }

    const callback = (event: TypedNotificationEvent<T>) => {
      const events = this.events$.getValue();
      const i = events.findIndex((e) => e.id === event.id);
      if (i !== -1) {
        const next = events.slice();
        next[i] = { ...next[i], ...event };
        this.events$.next(next);
      }

      if (actionCallback) {
        actionCallback(event);
      }
    };

    const item: RegisteredType = {
      typeId,
      ...type,
      callback: callback as (event: TypedNotificationEvent<unknown>) => void,
    };
    this.types$.next([...this.types$.getValue(), item]);

    return callback;
  }
}
