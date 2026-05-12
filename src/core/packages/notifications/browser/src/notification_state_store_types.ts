/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { NotificationEvent } from './events_types';

/**
 * `undefined` — the event is global (no spaceId).
 * Any other string — the spaceId the event was published into.
 */
export type NotificationStateScope = string | undefined;

/**
 * Persistence abstraction for the notification center.
 *
 * Owns:
 *  - The events array (persisted; survives page reload).
 *  - Read-state set per scope (`readIds`).
 *  - Pinned-state set per scope (`pinnedIds`).
 *
 * Shape-aligned with the future `core.userStorage` service so the current
 * localStorage-backed implementation can be swapped without changing
 * `EventsService`, the hooks, or the components.
 */
export interface NotificationStateStore {
  // --------------------------------------------------------------------------
  // Events array — the canonical persisted list.
  //
  // After `preload()` resolves, `getStoredEvents()` returns the persisted list
  // that survived the last page reload. `EventsService.start()` seeds its
  // in-memory `events$` from this snapshot.
  //
  // `saveEvent` / `removeEvent` are called on every mutation that affects an
  // event's contents (notify, markAsRead, pin/unpin). They keep storage in
  // lock-step with the live in-memory state.
  // --------------------------------------------------------------------------

  /** Synchronous snapshot of the persisted events list (post-`preload`). */
  getStoredEvents(): readonly NotificationEvent[];

  /** Upsert an event by `id` into the backing store. */
  saveEvent(event: NotificationEvent): Promise<void>;
  /** Remove an event from the backing store. */
  removeEvent(id: string): Promise<void>;

  // --------------------------------------------------------------------------
  // Read & pin state — scoped sets of event ids.
  // --------------------------------------------------------------------------

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
   */
  markRead(eventId: string, scope: NotificationStateScope): Promise<void>;
  markUnread(eventId: string, scope: NotificationStateScope): Promise<void>;
  pin(eventId: string, scope: NotificationStateScope): Promise<void>;
  unpin(eventId: string, scope: NotificationStateScope): Promise<void>;

  // --------------------------------------------------------------------------
  // Lifecycle.
  // --------------------------------------------------------------------------

  /**
   * Idempotent one-shot called by `EventsService.start()` before any
   * `notify()` can fire. After this resolves, `getStoredEvents`,
   * `getReadIds`, and `getPinnedIds` all return useful data synchronously.
   *
   * - LocalStorage impl: reads the persisted events array. Id sets remain
   *   lazy (populated on first access from the same synchronous backing
   *   store).
   * - UserStorage impl (future): awaits the page-metadata injection so all
   *   subsequent sync getters have data.
   */
  preload(): Promise<void>;
}
