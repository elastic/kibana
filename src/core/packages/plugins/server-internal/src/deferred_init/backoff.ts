/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared backoff scale for anything that retries around deferred plugin initialization:
 * {@link DeferredInitEngine}'s own cooldown between runner attempts, and
 * {@link PluginsSystem}'s retry of a plugin's `start()` when it fails because a dependency's
 * deferred init hasn't succeeded yet. Keeping both on the same scale means a `start()` retry
 * isn't more aggressive than the dependency it's waiting on could possibly resolve.
 */

/** Delay before the first retry. */
export const DEFERRED_INIT_BACKOFF_BASE_MS = 2_000;
/** Upper bound on the delay between retries. */
export const DEFERRED_INIT_BACKOFF_MAX_MS = 60_000;
/** Exponential growth factor applied per attempt, before capping at {@link DEFERRED_INIT_BACKOFF_MAX_MS}. */
export const DEFERRED_INIT_BACKOFF_FACTOR = 2;
