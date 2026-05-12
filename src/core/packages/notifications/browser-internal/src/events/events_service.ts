/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import type {
  INotificationEvents,
  NotificationEvent,
  NotificationEventTypeData,
  NotificationStateStore,
  NotificationTypeId,
  TypedNotificationEvent,
} from '@kbn/core-notifications-browser';

interface RegisteredType extends NotificationEventTypeData {
  typeId: NotificationTypeId;
  callback: (event: TypedNotificationEvent<unknown>) => void;
}

export class EventsService implements INotificationEvents {
  private readonly events$ = new BehaviorSubject<NotificationEvent[]>([]);
  private readonly types$ = new BehaviorSubject<RegisteredType[]>([]);
  /**
   * Reactive unread count maintained alongside `events$`. Subscribers (e.g.
   * the global-header badge) get O(1) re-renders that only fire when the
   * count actually changes — no need to iterate the full events list on every
   * render.
   */
  private readonly unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private readonly store: NotificationStateStore) {}

  /**
   * Awaits {@link NotificationStateStore.preload} before returning the public
   * interface. After this resolves, `notify()` can hydrate `isRead` / `isPinned`
   * from the store using synchronous getters.
   */
  public async start(): Promise<INotificationEvents> {
    await this.store.preload();
    return this;
  }

  public get$(): Observable<NotificationEvent[]> {
    return this.events$.asObservable();
  }

  public getUnreadCount$(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  public getUnreadCount(): number {
    return this.unreadCount$.getValue();
  }

  public notify(event: NotificationEvent): void {
    const scope = event.spaceId;
    // Sync reads — see NotificationStateStore docs for why these are not async.
    const readIds = this.store.getReadIds(scope);
    const pinnedIds = this.store.getPinnedIds(scope);

    const hydrated: NotificationEvent = {
      ...event,
      isRead: event.isRead || readIds.has(event.id),
      isPinned: (event.isPinned ?? false) || pinnedIds.has(event.id),
    };

    const events = this.events$.getValue();
    const index = events.findIndex((e) => e.id === hydrated.id);
    let next: NotificationEvent[];
    let unreadDelta = 0;

    if (index === -1) {
      // New event.
      next = [...events, hydrated];
      if (!hydrated.isRead) unreadDelta = 1;
    } else {
      // Upsert: replace existing entry in place.
      const previous = events[index];
      next = events.slice();
      next[index] = hydrated;
      if (previous.isRead && !hydrated.isRead) unreadDelta = 1;
      else if (!previous.isRead && hydrated.isRead) unreadDelta = -1;
    }

    this.events$.next(next);
    if (unreadDelta !== 0) {
      this.unreadCount$.next(this.unreadCount$.getValue() + unreadDelta);
    }
  }

  public async markAsRead(eventId: string, isRead: boolean): Promise<void> {
    const events = this.events$.getValue();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return;
    const previous = events[index];
    if (previous.isRead === isRead) return; // no-op

    const next = events.slice();
    next[index] = { ...previous, isRead };
    this.events$.next(next);
    this.unreadCount$.next(this.unreadCount$.getValue() + (isRead ? -1 : 1));

    const scope = previous.spaceId;
    if (isRead) {
      await this.store.markRead(eventId, scope);
    } else {
      await this.store.markUnread(eventId, scope);
    }
  }

  public async pin(eventId: string): Promise<void> {
    await this.setPinned(eventId, true);
  }

  public async unpin(eventId: string): Promise<void> {
    await this.setPinned(eventId, false);
  }

  private async setPinned(eventId: string, isPinned: boolean): Promise<void> {
    const events = this.events$.getValue();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return;
    const previous = events[index];
    if ((previous.isPinned ?? false) === isPinned) return; // no-op

    const next = events.slice();
    next[index] = { ...previous, isPinned };
    this.events$.next(next);

    const scope = previous.spaceId;
    if (isPinned) {
      await this.store.pin(eventId, scope);
    } else {
      await this.store.unpin(eventId, scope);
    }
  }

  public registerType<T>(
    typeId: NotificationTypeId,
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
