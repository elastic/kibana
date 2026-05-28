/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateName, StateOf } from './state';
import * as CHECK_SOURCE from './steps/check_source';
import * as CREATE_TARGET from './steps/create_target';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INIT from './steps/init';
import * as MARK_READY from './steps/mark_ready';
export { assertNever } from './assert_never';

export const SUCCESSORS = {
  [INIT.Name]: [CHECK_SOURCE.Name],
  [CHECK_SOURCE.Name]: [CREATE_TARGET.Name, FATAL.Name],
  [CREATE_TARGET.Name]: [CREATE_TARGET.Name, MARK_READY.Name, FATAL.Name],
  [MARK_READY.Name]: [DONE.Name, FATAL.Name],
  [DONE.Name]: [],
  [FATAL.Name]: [],
} as const satisfies Record<StateName, readonly StateName[]>;

export type SuccessorsOf<TName extends StateName> = (typeof SUCCESSORS)[TName][number];

export interface Step<TNext extends StateName, TResponse> {
  /**
   * Lamport's action label made executable: the IO operation associated with
   * the current state. The executed Lamport step `<s, action, t>` is implicit
   * in the loop driver: `s` is the input state, and `t` is returned by
   * `transition(await action())`.
   */
  readonly action: () => Promise<TResponse>;
  /**
   * Pure next-state function for this action's response.
   */
  readonly transition: (response: TResponse) => StateOf<TNext>;
}

export const runStep = async <TNext extends StateName, TResponse>({
  action,
  transition,
}: Step<TNext, TResponse>): Promise<StateOf<TNext>> => transition(await action());
