/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { PluginInitStatus } from '@kbn/core-deferred-init-common';

export type { PluginInitState, PluginInitStatus } from '@kbn/core-deferred-init-common';

/**
 * Lets a plugin wait for, or inspect, its own initialization. Core decides when the plugin's
 * `initialize()` runs (at boot by default, on first use when `plugins.initializeOnBoot` is
 * `false`); this object is how the plugin's own code makes sure it has, in either mode.
 * See {@link PluginInitializerContext.initialization}.
 * @public
 */
export interface PluginInitialization {
  /**
   * Make sure this plugin is initialized.
   *
   * Resolves immediately once `initialize()` has succeeded on this instance, joins an
   * attempt that is already in flight, and otherwise starts one: immediately, even when
   * the last attempt failed and a retry is still scheduled. Rejects with a
   * {@link PluginInitializationError} when the attempt fails, and rejects when called
   * during the plugin `setup` or `start` lifecycle, where awaiting it would block boot.
   * Do not await it from inside your own `initialize()`, directly or through one of your
   * contract functions: it would join the attempt that called it, wait for itself and
   * never settle.
   */
  initialize(): Promise<void>;
  /** Never triggers anything. Replays the current value to new subscribers. */
  status$: Observable<PluginInitStatus>;
  /** Current value of `status$`, synchronous. Never triggers anything. */
  getStatus(): PluginInitStatus;
}
