/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Backoff scale for {@link DeferredInitEngine}'s cooldown between failed runs of a plugin's
 * `lazyInitialize`. Applied with full jitter, so the values below bound the delay rather than
 * fixing it.
 */

/** Upper bound on the delay before the first retry. */
export const DEFERRED_INIT_BACKOFF_BASE_MS = 2_000;
/** Upper bound on the delay between retries, however many attempts have failed. */
export const DEFERRED_INIT_BACKOFF_MAX_MS = 60_000;
/** Exponential growth factor applied per attempt, before capping at {@link DEFERRED_INIT_BACKOFF_MAX_MS}. */
export const DEFERRED_INIT_BACKOFF_FACTOR = 2;
