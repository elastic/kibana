/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitState } from './plugin_init_status';

/**
 * Thrown when a plugin's `initialize()` has not succeeded on this Kibana instance. If it escapes
 * an HTTP route handler, core's central handler converts it to a `503` + `Retry-After` response.
 *
 * @public
 */
export class PluginInitializationError extends Error {
  public readonly pluginId: string;
  /**
   * Whether retrying later could plausibly succeed. `false` for errors that stem from a
   * misconfiguration rather than a transient failure, since retrying those cannot self-heal.
   */
  public readonly retriable: boolean;
  /**
   * The plugin's initialization state when this error was thrown, reported in core's `503` body.
   * `undefined` when the thrower had no state to attach.
   */
  public readonly status?: PluginInitState;

  constructor(
    pluginId: string,
    options?: { message?: string; cause?: unknown; retriable?: boolean; status?: PluginInitState }
  ) {
    super(
      options?.message ?? `Plugin "${pluginId}" has not finished initializing; retry later.`,
      options?.cause !== undefined ? { cause: options.cause } : undefined
    );
    this.name = 'PluginInitializationError';
    this.pluginId = pluginId;
    this.retriable = options?.retriable ?? true;
    this.status = options?.status;
    // Restores the prototype chain so `instanceof` keeps working across transpilation targets.
    Object.setPrototypeOf(this, PluginInitializationError.prototype);
  }
}

/**
 * Checks if `e` is a {@link PluginInitializationError}, by name as well so it matches across
 * bundle or realm boundaries where `instanceof` fails.
 *
 * @public
 */
export const isPluginInitializationError = (e: unknown): e is PluginInitializationError =>
  e instanceof PluginInitializationError ||
  (e instanceof Error && e.name === 'PluginInitializationError');
