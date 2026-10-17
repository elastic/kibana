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
 * Route pattern for core's always-available plugin initialization status endpoint, shared between the
 * server route registration and the browser status client so the two can't drift.
 *
 * @internal
 */
export const DEFERRED_INIT_STATUS_ROUTE = '/internal/core/deferred_init/{pluginId}';

/**
 * Body of the {@link DEFERRED_INIT_STATUS_ROUTE} response, shared between the server route
 * registration and the browser status client so the two can't drift.
 *
 * @internal
 */
export interface DeferredInitStatusResponse {
  pluginId: string;
  status: PluginInitState;
  /** The plugin's most recent `initialize()` error; present after a failed attempt, in any state, until an attempt succeeds. */
  error?: { message: string };
  /** How many consecutive attempts have failed; present after a failed attempt, in any state, until an attempt succeeds. */
  attempts?: number;
}

/**
 * Body of the `503` a gated route returns while a plugin's `initialize()` has not succeeded.
 * Both trigger paths (the guarded router and the central error handler for an escaped
 * {@link PluginInitializationError}) return this exact shape so clients read one stable body.
 *
 * @internal
 */
export interface DeferredInitUnavailableBody {
  pluginId: string;
  status: PluginInitState;
}
