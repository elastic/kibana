/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Initial polling interval in milliseconds. First wait uses this (in-process for short workflows).
 */
export const INITIAL_POLL_INTERVAL = 1;

/**
 * Maximum polling interval in milliseconds. Intervals above 5s yield to Task Manager
 * (see SHORT_DURATION_THRESHOLD in handle_execution_delay).
 */
export const MAX_POLL_INTERVAL = 30;

/**
 * Backoff multiplier for exponential backoff. Delays progress: 1s, 2s, 4s, 8s, 16s, 30s.
 */
export const BACKOFF_MULTIPLIER = 2;

/**
 * Returns the poll interval for the given poll count (exponential backoff) as a duration string.
 * Poll count 0 = INITIAL_POLL_INTERVAL, then multiplies by BACKOFF_MULTIPLIER each time, capped at MAX_POLL_INTERVAL.
 */
export function getNextPollInterval(pollCount: number): string {
  const nextInterval = Math.min(
    INITIAL_POLL_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, pollCount),
    MAX_POLL_INTERVAL
  );
  return `${nextInterval}s`;
}

/**
 * Maximum depth of nested workflow execution (workflow calling workflow).
 * Prevents infinite recursion and unbounded Task Manager usage.
 */
export const MAX_WORKFLOW_DEPTH = 10;
