/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, take, toArray } from 'rxjs';
import type { NotificationEvent } from '@kbn/core-notifications-browser';
import { EventsService } from './events_service';
import { LocalStorageNotificationStateStore } from './local_storage_state_store';

const baseEvent = (overrides: Partial<NotificationEvent> = {}): NotificationEvent => ({
  id: 'evt-1',
  timestamp: 1000,
  title: 'Title',
  message: 'Message',
  isRead: false,
  severity: 'info',
  eventName: 'demo',
  ...overrides,
});

describe('EventsService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('start', () => {
    it('awaits store.preload before resolving', async () => {
      const store = new LocalStorageNotificationStateStore();
      const preloadSpy = jest.spyOn(store, 'preload');
      const service = new EventsService(store);
      await service.start();
      expect(preloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('notify', () => {
    it('appends a new event and increments unreadCount when unread', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent());
      const events = await firstValueFrom(service.get$());
      expect(events).toHaveLength(1);
      expect(service.getUnreadCount()).toBe(1);
    });

    it('does not increment unreadCount when the event arrives already read', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent({ isRead: true }));
      expect(service.getUnreadCount()).toBe(0);
    });

    it('upserts by id — second notify replaces the first', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent({ title: 'First' }));
      service.notify(baseEvent({ title: 'Second' }));
      const events = await firstValueFrom(service.get$());
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Second');
    });

    it('adjusts unreadCount when an upsert flips isRead', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent({ isRead: false }));
      expect(service.getUnreadCount()).toBe(1);
      service.notify(baseEvent({ isRead: true }));
      expect(service.getUnreadCount()).toBe(0);
    });

    it('hydrates isRead from the store at notify time', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', undefined);
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ isRead: false }));
      const events = await firstValueFrom(service.get$());
      expect(events[0].isRead).toBe(true);
      // unread count stays at zero — the event was effectively read on arrival
      expect(service.getUnreadCount()).toBe(0);
    });

    it('hydrates isPinned from the store at notify time', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.pin('evt-1', undefined);
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent());
      const events = await firstValueFrom(service.get$());
      expect(events[0].isPinned).toBe(true);
    });

    it('uses event.spaceId when consulting the store', async () => {
      const store = new LocalStorageNotificationStateStore();
      await store.markRead('evt-1', 'default');
      const service = new EventsService(store);
      await service.start();

      // Global event with same id — should not be hydrated as read.
      service.notify(baseEvent({ id: 'evt-1' }));
      let events = await firstValueFrom(service.get$());
      expect(events[0].isRead).toBe(false);

      // Now publish with spaceId 'default' — should hydrate as read.
      service.notify(baseEvent({ id: 'evt-1', spaceId: 'default' }));
      events = await firstValueFrom(service.get$());
      expect(events[0].isRead).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('updates the event and decrements unreadCount', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent());
      expect(service.getUnreadCount()).toBe(1);
      await service.markAsRead('evt-1', true);
      const events = await firstValueFrom(service.get$());
      expect(events[0].isRead).toBe(true);
      expect(service.getUnreadCount()).toBe(0);
    });

    it('writes through to the store with the event scope', async () => {
      const store = new LocalStorageNotificationStateStore();
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ spaceId: 'default' }));
      await service.markAsRead('evt-1', true);
      expect(Array.from(store.getReadIds('default'))).toEqual(['evt-1']);
      expect(Array.from(store.getReadIds(undefined))).toEqual([]);
    });

    it('is a no-op for unknown event ids', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      await expect(service.markAsRead('missing', true)).resolves.toBeUndefined();
      expect(service.getUnreadCount()).toBe(0);
    });

    it('is a no-op when isRead is already at the requested value', async () => {
      const store = new LocalStorageNotificationStateStore();
      const markReadSpy = jest.spyOn(store, 'markRead');
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ isRead: true }));
      await service.markAsRead('evt-1', true);
      expect(markReadSpy).not.toHaveBeenCalled();
    });
  });

  describe('pin / unpin', () => {
    it('toggles isPinned and writes through to the store', async () => {
      const store = new LocalStorageNotificationStateStore();
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent());
      await service.pin('evt-1');
      let events = await firstValueFrom(service.get$());
      expect(events[0].isPinned).toBe(true);
      expect(Array.from(store.getPinnedIds(undefined))).toEqual(['evt-1']);

      await service.unpin('evt-1');
      events = await firstValueFrom(service.get$());
      expect(events[0].isPinned).toBe(false);
      expect(Array.from(store.getPinnedIds(undefined))).toEqual([]);
    });

    it('respects the event spaceId when writing', async () => {
      const store = new LocalStorageNotificationStateStore();
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ spaceId: 'default' }));
      await service.pin('evt-1');
      expect(Array.from(store.getPinnedIds('default'))).toEqual(['evt-1']);
      expect(Array.from(store.getPinnedIds(undefined))).toEqual([]);
    });

    it('is idempotent', async () => {
      const store = new LocalStorageNotificationStateStore();
      const pinSpy = jest.spyOn(store, 'pin');
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent());
      await service.pin('evt-1');
      await service.pin('evt-1');
      expect(pinSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerType / getPrimaryActionForEvent', () => {
    it('returns undefined for an event with no typeId', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      const result = service.getPrimaryActionForEvent(baseEvent());
      expect(result).toBeUndefined();
    });

    it('returns undefined for an unregistered typeId', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.notify(baseEvent({ typeId: 'notificationExampleFoo' as const }));
      const result = service.getPrimaryActionForEvent(
        baseEvent({ typeId: 'notificationExampleFoo' as const })
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when the type is registered without a resolver', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.registerType('notificationExampleFoo' as const, {
        severity: 'info',
        eventName: 'foo',
      });
      const result = service.getPrimaryActionForEvent(
        baseEvent({ typeId: 'notificationExampleFoo' as const })
      );
      expect(result).toBeUndefined();
    });

    it('calls resolvePrimaryAction with the event and returns the descriptor', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      const descriptor = { label: 'Download', onClick: jest.fn() };
      const resolver = jest.fn().mockReturnValue(descriptor);

      service.registerType(
        'notificationExampleFoo' as const,
        { severity: 'info', eventName: 'foo' },
        undefined,
        resolver
      );

      const event = baseEvent({ typeId: 'notificationExampleFoo' as const });
      const result = service.getPrimaryActionForEvent(event);

      expect(resolver).toHaveBeenCalledWith(event);
      expect(result).toBe(descriptor);
    });

    it('returns undefined when resolver returns undefined', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      service.registerType(
        'notificationExampleFoo' as const,
        { severity: 'info', eventName: 'foo' },
        undefined,
        () => undefined
      );
      const result = service.getPrimaryActionForEvent(
        baseEvent({ typeId: 'notificationExampleFoo' as const })
      );
      expect(result).toBeUndefined();
    });

    it('first registration wins — second registerType for same typeId is a no-op', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      const firstResolver = jest.fn().mockReturnValue({ label: 'First', onClick: jest.fn() });
      const secondResolver = jest.fn().mockReturnValue({ label: 'Second', onClick: jest.fn() });

      service.registerType(
        'notificationExampleFoo' as const,
        { severity: 'info', eventName: 'foo' },
        undefined,
        firstResolver
      );
      service.registerType(
        'notificationExampleFoo' as const,
        { severity: 'info', eventName: 'foo' },
        undefined,
        secondResolver
      );

      const event = baseEvent({ typeId: 'notificationExampleFoo' as const });
      const result = service.getPrimaryActionForEvent(event);

      expect(firstResolver).toHaveBeenCalledWith(event);
      expect(secondResolver).not.toHaveBeenCalled();
      expect(result?.label).toBe('First');
    });
  });

  describe('getUnreadCount$', () => {
    it('emits the initial count and on every change', async () => {
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      const promise = firstValueFrom(service.getUnreadCount$().pipe(take(4), toArray()));
      service.notify(baseEvent({ id: 'a' }));
      service.notify(baseEvent({ id: 'b' }));
      await service.markAsRead('a', true);
      const emissions = await promise;
      expect(emissions).toEqual([0, 1, 2, 1]);
    });
  });

  describe('event persistence', () => {
    it('seeds events$ from the store on start', async () => {
      // Pre-seed the store as if persisted by a previous page session.
      const seeded = new LocalStorageNotificationStateStore();
      await seeded.preload();
      await seeded.saveEvent(baseEvent({ id: 'a', isRead: false }));
      await seeded.saveEvent(baseEvent({ id: 'b', isRead: true }));

      // Fresh service starting against the same backing storage.
      const service = new EventsService(new LocalStorageNotificationStateStore());
      await service.start();
      const events = await firstValueFrom(service.get$());
      expect(events.map((e) => e.id)).toEqual(['a', 'b']);
      expect(service.getUnreadCount()).toBe(1);
    });

    it('writes through to the store on notify', async () => {
      const store = new LocalStorageNotificationStateStore();
      const saveSpy = jest.spyOn(store, 'saveEvent');
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ id: 'evt-1' }));
      // saveEvent is fire-and-forget inside notify(); flush the microtask queue.
      await Promise.resolve();
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy.mock.calls[0][0].id).toBe('evt-1');
      expect(store.getStoredEvents().map((e) => e.id)).toEqual(['evt-1']);
    });

    it('writes through to the store on markAsRead', async () => {
      const store = new LocalStorageNotificationStateStore();
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ id: 'evt-1' }));
      await Promise.resolve();
      await service.markAsRead('evt-1', true);
      const stored = store.getStoredEvents().find((e) => e.id === 'evt-1');
      expect(stored?.isRead).toBe(true);
    });

    it('writes through to the store on pin / unpin', async () => {
      const store = new LocalStorageNotificationStateStore();
      const service = new EventsService(store);
      await service.start();
      service.notify(baseEvent({ id: 'evt-1' }));
      await Promise.resolve();
      await service.pin('evt-1');
      expect(store.getStoredEvents().find((e) => e.id === 'evt-1')?.isPinned).toBe(true);
      await service.unpin('evt-1');
      expect(store.getStoredEvents().find((e) => e.id === 'evt-1')?.isPinned).toBe(false);
    });
  });
});
