/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Centralized timeout values for workflow Scout UI tests.
 * Tune these in one place when environment speed changes.
 */

/** Timeout for a simple workflow execution to complete (e.g. console steps). */
export const EXECUTION_TIMEOUT = 30_000;

/** Timeout for a long-running workflow execution (e.g. many iterations, alert trigger chain). */
export const LONG_EXECUTION_TIMEOUT = 60_000;

/** Timeout for waiting on asynchronous alert-triggered executions to appear in the list. */
export const ALERT_PROPAGATION_TIMEOUT = 60_000;
