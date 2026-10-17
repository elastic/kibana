/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { AppInitializingState, AppInitializingError } from '@kbn/core-application-browser';

/**
 * Status of a plugin's server-side `initialize()`, as observed from the browser.
 *
 * @internal
 */
export interface DeferredInitStatus {
  status: AppInitializingState;
  /** The plugin's most recent `initialize()` error; present after a failed attempt, in any state, until an attempt succeeds. */
  error?: AppInitializingError;
  /** How many consecutive attempts have failed; present after a failed attempt, in any state, until an attempt succeeds. */
  attempts?: number;
}

/**
 * Browser-side view of each plugin's server-side `initialize()` status. Core uses it to gate the
 * registered apps of a plugin with `initialize()` behind `<AppInitializingGate>`; it is a core
 * mechanism and is not exposed to plugins.
 *
 * @internal
 */
export interface DeferredInitStart {
  /**
   * Observable of a plugin's initialization status. Core owns the underlying fetch loop
   * (triggering, polling, backoff, cleanup); the returned observable is shared across
   * subscribers and stops polling once no one is subscribed.
   */
  getStatus$(pluginId: string): Observable<DeferredInitStatus>;

  /** Force an immediate re-check for a plugin id, outside the normal poll cadence. */
  refresh(pluginId: string): void;
}
