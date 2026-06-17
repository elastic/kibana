/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationLog } from '../types';
import type { BaseState, StateName, StateOf, TransitionExtras } from './state';
import { appendLog, incrementRetry, transitionTo } from './state';
import type { RetryableFailureResponse } from './io_helpers';
import * as FATAL from './steps/fatal';

export const resetRetryFields = <TState extends BaseState>(state: TState): TState => ({
  ...state,
  retryCount: state.skipRetryReset ? state.retryCount : 0,
  retryDelay: state.skipRetryReset ? state.retryDelay : 0,
  skipRetryReset: false,
});

export const delayRetryTransition = <
  TName extends StateName,
  TFrom extends StateOf<TName> = StateOf<TName>
>(
  state: TFrom,
  errorMessage: string,
  maxRetryAttempts: number,
  selfExtras: TransitionExtras<TFrom, TName>
): StateOf<TName> | FATAL.State => {
  if (state.retryCount >= maxRetryAttempts) {
    return transitionTo<TFrom, typeof FATAL.Name>(
      appendLog(
        state,
        `Unable to complete the ${state.name} step after ${maxRetryAttempts} attempts. Last failure: ${errorMessage}`
      ),
      FATAL.Name,
      {
        reason: `Unable to complete the ${state.name} step after ${maxRetryAttempts} attempts, terminating. The last failure message was: ${errorMessage}`,
      } as unknown as TransitionExtras<TFrom, typeof FATAL.Name>
    );
  }
  const retryCount = state.retryCount + 1;
  const retryDelay = 1000 * Math.min(Math.pow(2, retryCount), 64);
  return transitionTo(
    {
      ...incrementRetry(
        appendLog(
          state,
          `Action failed with '${errorMessage}'. Retrying ${retryCount} in ${retryDelay / 1000}s.`
        )
      ),
      retryDelay,
    },
    state.name,
    selfExtras
  );
};

export const handleRetryableFailure = <
  TName extends StateName,
  TFrom extends StateOf<TName> = StateOf<TName>
>(
  state: TFrom,
  response: RetryableFailureResponse,
  selfExtras: TransitionExtras<TFrom, TName>,
  maxAttempts: number = state.retryAttempts
): StateOf<TName> | FATAL.State =>
  delayRetryTransition(state, response.message, maxAttempts, selfExtras);

export const clusterRoutingRetryMessage = (state: {
  migrationDocLinks: { routingAllocationDisabled: string };
}): string =>
  `[incompatible_cluster_routing_allocation] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to ${state.migrationDocLinks.routingAllocationDisabled} for more information on how to resolve the issue.`;

export const appendMigrationLog = <TState extends BaseState>(
  state: TState,
  log: MigrationLog
): TState => ({
  ...state,
  logs: [...state.logs, log],
});
