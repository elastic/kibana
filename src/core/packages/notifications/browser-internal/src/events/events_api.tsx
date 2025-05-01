/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import {
  INotificationEvents,
  NotificationEvent,
  NotificationEventTypeData,
  RegisteredNotificationEventType,
  TypedNotificationEvent,
} from '@kbn/core-notifications-browser';

export class NotificationEventsApi implements INotificationEvents {
  private notificationEvents$ = new BehaviorSubject<NotificationEvent[]>([]);
  private types = new BehaviorSubject<Array<RegisteredNotificationEventType<{}>>>([]);

  constructor() {}

  public get$() {
    return this.notificationEvents$.asObservable();
  }

  public markAsRead(eventId: string, isRead: boolean) {
    const events = this.notificationEvents$.getValue();
    const index = events.findIndex((e) => e.id === eventId);

    if (index !== -1) {
      events[index] = { ...events[index], isRead };
      this.notificationEvents$.next(events);
    }
  }
  public registerType<T>(
    typeId: string,
    type: NotificationEventTypeData,
    actionCallback?: (event: TypedNotificationEvent<T>) => void
  ): (event: TypedNotificationEvent<T>) => void {
    const types = this.types.getValue();
    let item = types.find((t) => t.typeId === typeId);

    if (!item) {
      item = {
        typeId,
        ...type,
        callback: (event: TypedNotificationEvent<T>) => {
          const events = this.notificationEvents$.getValue();
          const i = events.findIndex((e) => e.id === event.id);

          if (i !== -1) {
            events[i] = { ...events[i], ...event };
            this.notificationEvents$.next(events);
          }

          if (actionCallback) {
            actionCallback(event);
          }
        },
      };
      types.push(item);
      this.types.next(types);
    }

    return types[index].callback;
  }

  public notify(event: NotificationEvent) {
    const events = this.notificationEvents$.getValue();
    events.push(event);
    this.notificationEvents$.next(events);
  }
}
