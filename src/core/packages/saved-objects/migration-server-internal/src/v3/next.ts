/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from './context';
import type { IO } from './io';
import type { NonTerminalState, State, StateName } from './state';
import { STEPS } from './successors';
import { runStep, type Step } from './types';

type AnyStepFactory = (
  state: NonTerminalState,
  io: IO,
  context: MigrationContext
) => Step<StateName, Awaited<ReturnType<IO[keyof IO]>>>;

/**
 * Executes the step of the current state and returns the next state.
 *
 * The cast widens the per-state factory signature to the union of states. It is
 * sound because the factory is looked up by the state's own discriminant.
 */
export const next = (
  state: NonTerminalState,
  io: IO,
  context: MigrationContext
): Promise<State> => {
  const factory = STEPS[state.controlState] as AnyStepFactory;
  return runStep(factory(state, io, context));
};
