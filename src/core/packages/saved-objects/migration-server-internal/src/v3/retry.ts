/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseState } from './migration_state';
import type { NonTerminalState } from './state';
import { appendLog } from './state';
import * as FATAL from './steps/fatal';

/** Retry budget of the states that poll until a condition is met. */
export const UNBOUNDED_RETRIES = Number.MAX_SAFE_INTEGER;

export const fail = (state: BaseState, reason: string): FATAL.State => ({
  ...state,
  controlState: FATAL.Name,
  reason,
});

/**
 * Self-loop on the current state with an exponential delay (2s, 4s, ... 64s),
 * or FATAL once `maxAttempts` retries have been made.
 */
export const retry = <TState extends NonTerminalState>(
  state: TState,
  message: string,
  maxAttempts: number
): TState | FATAL.State => {
  if (state.retryCount >= maxAttempts) {
    return fail(
      state,
      `Unable to complete the ${state.controlState} step after ${maxAttempts} attempts, terminating. The last failure message was: ${message}`
    );
  }
  const retryCount = state.retryCount + 1;
  const retryDelay = 1000 * Math.min(Math.pow(2, retryCount), 64);
  return {
    ...appendLog(
      state,
      'error',
      `Action failed with '${message}'. Retrying attempt ${retryCount} in ${
        retryDelay / 1000
      } seconds.`
    ),
    retryCount,
    retryDelay,
  };
};
