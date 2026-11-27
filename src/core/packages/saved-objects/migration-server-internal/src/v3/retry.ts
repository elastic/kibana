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

export const fail = (state: BaseState, reason: string): FATAL.State => ({
  ...state,
  controlState: FATAL.Name,
  reason,
});

const backoffDelay = (attempt: number): number => 1000 * Math.min(Math.pow(2, attempt), 64);

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
  const retryDelay = backoffDelay(retryCount);
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

/**
 * Self-loop on the current state until a condition is met (e.g. a task completes), with an exponential delay.
 * Polls are unbounded and don't use the retry budget, which is left for the failures.
 */
export const poll = <TState extends NonTerminalState>(state: TState, message: string): TState => {
  const pollCount = state.pollCount + 1;
  const retryDelay = backoffDelay(pollCount);
  return {
    ...appendLog(state, 'info', `${message}. Checking again in ${retryDelay / 1000} seconds.`),
    pollCount,
    retryDelay,
  };
};
