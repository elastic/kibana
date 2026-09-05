/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateName, StateOf } from './state';

export { assertNever } from './assert_never';

// The graph lives in `./successors`. Re-exported here so step files can keep
// importing `{ Step, SuccessorsOf }` from a single place; direct consumers of
// the table (the loop driver, invariants, tests) should import from
// `./successors` to make the source of truth obvious.
export { SUCCESSORS, type SuccessorsOf } from './successors';

export interface Step<TNext extends StateName, TResponse> {
  /**
   * Lamport's action label made executable: the IO operation associated with
   * the current state. The executed Lamport step `<s, action, t>` is implicit
   * in the loop driver: `s` is the input state, and `t` is returned by
   * `transition(await action())`.
   */
  readonly action: () => Promise<TResponse>;
  /**
   * Pure next-state function for this action's response. Constrained to
   * `StateOf<TNext>` so a transition that lands outside the SUCCESSORS row
   * for this step is a compile error.
   */
  readonly transition: (response: TResponse) => StateOf<TNext>;
}

export const runStep = async <TNext extends StateName, TResponse>({
  action,
  transition,
}: Step<TNext, TResponse>): Promise<StateOf<TNext>> => transition(await action());
