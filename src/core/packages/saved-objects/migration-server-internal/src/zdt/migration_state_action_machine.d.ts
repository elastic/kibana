/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { type Next } from '../state_action_machine';
import type { State } from './state';
import type { MigratorContext } from './context';
/**
 * A specialized migrations-specific state-action machine that:
 *  - logs messages in state.logs
 *  - logs state transitions
 *  - logs action responses
 *  - resolves if the final state is DONE
 *  - rejects if the final state is FATAL
 *  - catches and logs exceptions and then rejects with a migrations specific error
 */
export declare function migrationStateActionMachine({
  initialState,
  context,
  next,
  model,
  logger,
}: {
  initialState: State;
  context: MigratorContext;
  next: Next<State>;
  model: (state: State, res: any, context: MigratorContext) => State;
  logger: Logger;
}): Promise<{
  status: 'patched';
  destIndex: string;
  elapsedMs: number;
}>;
