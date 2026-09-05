/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IO } from './io';
import type { NonTerminalState, State, StateName } from './state';
import { runStep, type Step } from './types';
import { STEPS } from './successors';

/**
 * Loop driver. Reads the step factory for the current state from the `STEPS`
 * dispatch table in `./successors`, executes it, and returns the next state.
 *
 * `STEPS` is `satisfies`-checked against `NonTerminalState['name']`, so the
 * compiler guarantees every non-terminal state has a wired-up factory. The
 * cast here widens each entry's per-state factory signature
 * (e.g. `(s: INIT.State, io) => Step<…>`) to the union argument so we can
 * invoke with `state: NonTerminalState`; soundness comes from the dispatch
 * key being the state's own `name` discriminant.
 */
export const next = (state: NonTerminalState, io: IO): Promise<State> => {
  const factory = STEPS[state.name] as (s: NonTerminalState, io: IO) => Step<StateName, unknown>;
  return runStep(factory(state, io));
};
