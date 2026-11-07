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
 * Status of a plugin's `initialize()` on this Kibana instance.
 * - `idle`: not started yet. Core starts it once every plugin's `start()` has returned.
 * - `initializing`: running.
 * - `available`: succeeded, or the plugin has no `initialize()` and its `start()` has returned.
 * - `failed`: threw, and Kibana is shutting down.
 *
 * @public
 */
export type PluginInitStatus = 'idle' | 'initializing' | 'available' | 'failed';

/**
 * Lets a plugin wait for, or inspect, its own initialization.
 * See {@link PluginInitializerContext.initialization}.
 *
 * @public
 */
export interface PluginInitialization {
  /**
   * Resolves once this plugin is `available` and rejects when its `initialize()` fails. Rejects
   * when called before every plugin's `start()` has returned, where waiting would block boot.
   */
  initialize(): Promise<void>;
  /** Emits the current status to new subscribers, then every change. */
  status$: Observable<PluginInitStatus>;
  /** Current value of `status$`. */
  getStatus(): PluginInitStatus;
}
