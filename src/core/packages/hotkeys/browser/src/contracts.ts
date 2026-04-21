/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { AppScopedHotkeys, HotkeyDefinition, HotkeyHandle } from './types';

/**
 * Setup contract for the hotkeys service.
 *
 * Registration lives on {@link HotkeysStart} because plugins typically register
 * hotkeys from `start()` where `application.currentAppId$` is available. This
 * setup contract is intentionally empty today and reserved for future
 * capability injection, mirroring the notifications service shape.
 *
 * @public
 */
export type HotkeysSetup = Record<string, never>;

/**
 * Start contract for the hotkeys service.
 *
 * @public
 */
export interface HotkeysStart {
  /**
   * Register a hotkey. Prefer {@link HotkeysStart.forApp} for app-level shortcuts
   * so `appId` is injected automatically.
   */
  register(def: HotkeyDefinition, handler: (event: KeyboardEvent) => void): HotkeyHandle;

  /**
   * Register multiple hotkeys at once. Returns a single dispose that unregisters all of them.
   */
  registerMany(
    defs: Array<{ def: HotkeyDefinition; handler: (event: KeyboardEvent) => void }>
  ): () => void;

  /**
   * Create an app-scoped registrar.
   *
   * When `appId` is omitted, the service snapshots
   * `application.currentAppId$.getValue()` at the call site and pins it on the
   * returned scope for its entire lifetime. Scopes never silently "follow" the
   * user to another app.
   *
   * If `currentAppId$` has no value yet, `register()` calls are buffered and
   * flushed on the first emission; a dev-mode warning is logged so authors
   * know to either pass an explicit `appId` or move the call inside the app
   * mount.
   */
  forApp(appId?: string): AppScopedHotkeys;

  /**
   * Observable of the current set of Kibana-registered hotkeys. Emits whenever
   * registrations are added, removed, or updated.
   *
   * Only registrations that went through this service are included; raw
   * `@tanstack/hotkeys` registrations made by third-party code are not surfaced.
   */
  getRegistrations$(): Observable<ReadonlyArray<HotkeyDefinition>>;
}
