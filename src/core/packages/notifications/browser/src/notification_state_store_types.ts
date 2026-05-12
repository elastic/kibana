/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

/**
 * `undefined` — the event is global (no spaceId).
 * Any other string — the spaceId the event was published into.
 */
export type NotificationStateScope = string | undefined;

/**
 * Persistence abstraction for notification user state (read receipts, pins).
 *
 * Shape-aligned with the in-review `core.userStorage` service so that the
 * current localStorage-backed implementation can be swapped for a
 * UserStorage-backed implementation without changing `EventsService`, the
 * hooks, or the components.
 *
 * Only non-default values are persisted: an event whose id is in neither
 * `readIds` nor `pinnedIds` defaults to unread + unpinned. This keeps the
 * persisted footprint minimal.
 */
export interface NotificationStateStore {
  /**
   * Reactive observables. Emit on every internal mutation.
   * (Future: also emit on cross-tab `storage` events.)
   */
  readIds$(scope: NotificationStateScope): Observable<ReadonlySet<string>>;
  pinnedIds$(scope: NotificationStateScope): Observable<ReadonlySet<string>>;

  /**
   * Synchronous getters used inside `EventsService.notify()`.
   *
   * `notify()` is called frequently and is currently synchronous. If these
   * reads were async, every caller would have to `await notify()` and
   * concurrent publishes would lose ordering. To keep `notify()` sync, the
   * store maintains an in-memory `BehaviorSubject<Set<string>>` per
   * (scope, kind) tuple and these getters just return `subject.getValue()`.
   *
   * The mirror is populated by `preload()` at start, and updated synchronously
   * by every mutation before the async write returns.
   */
  getReadIds(scope: NotificationStateScope): ReadonlySet<string>;
  getPinnedIds(scope: NotificationStateScope): ReadonlySet<string>;

  /**
   * Mutations. Return `Promise<void>` because the write — not the read — hits
   * the backing store. Today: localStorage wrapped in `Promise.resolve()`.
   * Future (UserStorage backend): a network call to a server-backed store.
   *
   * Each mutation updates the in-memory subject synchronously *first*, so a
   * sync `getReadIds()` call right after `markRead()` reflects the new value
   * without waiting for the Promise.
   */
  markRead(eventId: string, scope: NotificationStateScope): Promise<void>;
  markUnread(eventId: string, scope: NotificationStateScope): Promise<void>;
  pin(eventId: string, scope: NotificationStateScope): Promise<void>;
  unpin(eventId: string, scope: NotificationStateScope): Promise<void>;

  /**
   * Idempotent one-shot called by `EventsService.start()` before any
   * `notify()` can fire. This is what makes the subsequent sync getters
   * (`getReadIds`, `getPinnedIds`) viable — without a `preload()`, those
   * getters wouldn't have the data ready and the publish path would have to
   * go async.
   *
   * - LocalStorage impl: no-op (reads are lazy, populated on first access
   *   from `localStorage.getItem`, which is itself synchronous).
   * - UserStorage impl (future): awaits the page-metadata injection so
   *   subsequent sync getters have data.
   *
   * The name comes from uiSettings / userStorage where values are
   * pre-loaded into page metadata during rendering so consumers can read
   * them synchronously from first render.
   */
  preload(): Promise<void>;
}
