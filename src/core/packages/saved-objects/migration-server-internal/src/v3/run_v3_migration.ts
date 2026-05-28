/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import { next } from './next';
import { createInitialState, isTerminalState, type State, type TerminalState } from './state';

export interface RunV3MigrationParams {
  readonly io: IO;
  readonly retryAttempts?: number;
}

export const runV3Migration = async ({
  io,
  retryAttempts = 3,
}: RunV3MigrationParams): Promise<TerminalState> => {
  let state: State = createInitialState(retryAttempts);

  while (!isTerminalState(state)) {
    state = await next(state, io);
  }

  return state;
};
