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
  NotificationEvent,
  NotificationStateScope,
  NotificationStateStore,
} from '@kbn/core-notifications-browser';

/**
 * TEMPORARY localStorage-backed implementation of {@link NotificationStateStore}.
 *
 * This is a stopgap until `core.userStorage` browser-side hooks ship (see RFC:
 * `core.userStorage` / Per-User Storage in Kibana). When that lands, this file
 * is deleted and replaced by a `UserStorageNotificationStateStore` adapter;
 * the only other change is one line in `NotificationsService.start()` to swap
 * the constructor.
 *
 * The interface is intentionally shape-aligned with `core.userStorage` (sync
 * getters, async writes).
 */

const KEY_PREFIX = 'core.notifications.events';
const EVENTS_KEY = `${KEY_PREFIX}.events`;

/**
 * Defensive validation for spaceIds. We never trust caller input to be safe
 * in a localStorage key (and the future userStorage backend has its own
 * registration-time validation). Only allow alphanumerics, `_`, and `-`.
 */
const SPACE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function buildIdSetKey(scope: NotificationStateScope, kind: 'readIds' | 'pinnedIds'): string {
  if (scope === undefined) {
    return `${KEY_PREFIX}.${kind}`;
  }
  if (!SPACE_ID_PATTERN.test(scope)) {
    throw new Error(
      `Invalid spaceId "${scope}" — notification state keys only accept [A-Za-z0-9_-].`
    );
  }
  return `${KEY_PREFIX}.${scope}.${kind}`;
}

function readSetFromLocalStorage(key: string): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (raw === null) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function writeSetToLocalStorage(key: string, set: ReadonlySet<string>): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Quota exceeded, disabled storage, etc. — silently swallow.
  }
}

function readEventsFromLocalStorage(): NotificationEvent[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(EVENTS_KEY) : null;
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Light validation — drop anything that doesn't look like a notification event.
    return parsed.filter(
      (item): item is NotificationEvent =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

function writeEventsToLocalStorage(events: readonly NotificationEvent[]): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // Quota exceeded, disabled storage, etc. — silently swallow.
  }
}

export class LocalStorageNotificationStateStore implements NotificationStateStore {
  private readonly readBuckets = new Map<string, BehaviorSubject<Set<string>>>();
  private readonly pinnedBuckets = new Map<string, BehaviorSubject<Set<string>>>();

  /** Loaded events as they exist in localStorage. Hydrated by `preload()`. */
  private storedEvents: NotificationEvent[] = [];

  /**
   * Reads the persisted events list into the in-memory snapshot. Id sets
   * (`readIds`, `pinnedIds`) remain lazy — they hydrate from localStorage on
   * first access, which is synchronous since `localStorage.getItem` is too.
   */
  public async preload(): Promise<void> {
    this.storedEvents = readEventsFromLocalStorage();
  }

  public getStoredEvents(): readonly NotificationEvent[] {
    return this.storedEvents;
  }

  public saveEvent(event: NotificationEvent): Promise<void> {
    const idx = this.storedEvents.findIndex((e) => e.id === event.id);
    if (idx === -1) {
      this.storedEvents = [...this.storedEvents, event];
    } else {
      const next = this.storedEvents.slice();
      next[idx] = event;
      this.storedEvents = next;
    }
    writeEventsToLocalStorage(this.storedEvents);
    return Promise.resolve();
  }

  public removeEvent(id: string): Promise<void> {
    const next = this.storedEvents.filter((e) => e.id !== id);
    if (next.length === this.storedEvents.length) return Promise.resolve();
    this.storedEvents = next;
    writeEventsToLocalStorage(this.storedEvents);
    return Promise.resolve();
  }

  public readIds$(scope: NotificationStateScope): Observable<ReadonlySet<string>> {
    return this.readBucket(scope).asObservable();
  }

  public pinnedIds$(scope: NotificationStateScope): Observable<ReadonlySet<string>> {
    return this.pinnedBucket(scope).asObservable();
  }

  public getReadIds(scope: NotificationStateScope): ReadonlySet<string> {
    return this.readBucket(scope).getValue();
  }

  public getPinnedIds(scope: NotificationStateScope): ReadonlySet<string> {
    return this.pinnedBucket(scope).getValue();
  }

  public markRead(eventId: string, scope: NotificationStateScope): Promise<void> {
    return this.mutate(this.readBucket(scope), buildIdSetKey(scope, 'readIds'), (set) => {
      set.add(eventId);
    });
  }

  public markUnread(eventId: string, scope: NotificationStateScope): Promise<void> {
    return this.mutate(this.readBucket(scope), buildIdSetKey(scope, 'readIds'), (set) => {
      set.delete(eventId);
    });
  }

  public pin(eventId: string, scope: NotificationStateScope): Promise<void> {
    return this.mutate(this.pinnedBucket(scope), buildIdSetKey(scope, 'pinnedIds'), (set) => {
      set.add(eventId);
    });
  }

  public unpin(eventId: string, scope: NotificationStateScope): Promise<void> {
    return this.mutate(this.pinnedBucket(scope), buildIdSetKey(scope, 'pinnedIds'), (set) => {
      set.delete(eventId);
    });
  }

  private readBucket(scope: NotificationStateScope): BehaviorSubject<Set<string>> {
    return this.getOrCreateBucket(this.readBuckets, buildIdSetKey(scope, 'readIds'));
  }

  private pinnedBucket(scope: NotificationStateScope): BehaviorSubject<Set<string>> {
    return this.getOrCreateBucket(this.pinnedBuckets, buildIdSetKey(scope, 'pinnedIds'));
  }

  private getOrCreateBucket(
    map: Map<string, BehaviorSubject<Set<string>>>,
    key: string
  ): BehaviorSubject<Set<string>> {
    const existing = map.get(key);
    if (existing) return existing;
    const subject = new BehaviorSubject<Set<string>>(readSetFromLocalStorage(key));
    map.set(key, subject);
    return subject;
  }

  private mutate(
    subject: BehaviorSubject<Set<string>>,
    key: string,
    apply: (set: Set<string>) => void
  ): Promise<void> {
    const next = new Set(subject.getValue());
    apply(next);
    subject.next(next);
    writeSetToLocalStorage(key, next);
    return Promise.resolve();
  }
}
