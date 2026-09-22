/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import { assertInvariants } from './invariants';
import { next } from './next';
import type { State as InitState } from './steps/init';
import { createInitialState, isTerminalState, type State, type TerminalState } from './state';

export interface RunV3MigrationParams {
  readonly io: IO;
  readonly retryAttempts?: number;
}

export const runV3Migration = async ({
  io,
  retryAttempts = 3,
}: RunV3MigrationParams): Promise<TerminalState> => {
  // POC runner: full INIT params are supplied by production wiring; retryAttempts-only is a stub.
  let state: State = createInitialState({
    retryAttempts,
    retryCount: 0,
    skipRetryReset: false,
    retryDelay: 0,
    logs: [],
  } as unknown as Omit<InitState, 'name'>);
  // Keep invariants always-on in this POC. Migrations run once per upgrade, and
  // catching a malformed state is worth the tiny assertion cost.
  assertInvariants(state);

  while (!isTerminalState(state)) {
    state = await next(state, io);
    assertInvariants(state);
  }

  return state;
};
