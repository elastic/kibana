/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The states a plugin's `initialize()` moves through on one Kibana instance.
 * @public
 */
export type PluginInitState = 'idle' | 'initializing' | 'available' | 'failed';

/**
 * Where a plugin's `initialize()` stands on this Kibana instance. Held in memory per instance,
 * like any other `/status` entry: every instance runs `initialize()` itself and reports its own
 * state.
 * @public
 */
export interface PluginInitStatus {
  /**
   * `idle`: `initialize()` has not run yet. `initializing`: an attempt is in flight.
   * `available`: the last attempt succeeded; sticky for the process lifetime.
   * `failed`: the last attempt threw; core retries with backoff, and once background
   * retries run out the next request or `initialize()` call starts a fresh attempt.
   */
  state: PluginInitState;
  /** Consecutive failed attempts since the last success. */
  attempts: number;
  /** Error from the most recent failed attempt, present while `failed` and during the retry that follows it. */
  lastError?: Error;
}
