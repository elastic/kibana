/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateName, StateOf } from './state';

export type { SuccessorsOf } from './successors';

/**
 * A step of the migration state machine: the IO `action` associated with the
 * current state, and the pure `transition` that computes the next state from
 * the action's response.
 *
 * `TNext` is the step's row in `SUCCESSORS`, so a transition that lands on a
 * state outside that row is a compile error.
 */
export interface Step<TNext extends StateName, TResponse> {
  readonly action: () => Promise<TResponse>;
  readonly transition: (response: TResponse) => StateOf<TNext>;
}

export const runStep = async <TNext extends StateName, TResponse>({
  action,
  transition,
}: Step<TNext, TResponse>): Promise<StateOf<TNext>> => transition(await action());

/** Exhaustiveness check for discriminated unions. */
export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
};
