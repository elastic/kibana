/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Expect, Equals, Extends } from './type_test_helpers';
import type { NonTerminalState, StateOf } from '../state';
import type { Step, SuccessorsOf } from '../types';
import type { InitResponse } from '../io';
import type { STEPS } from '../successors';
import type * as INIT from '../steps/init';
import type * as REFRESH_SOURCE from '../steps/refresh_source';
import type * as DONE from '../steps/done';
import type * as FATAL from '../steps/fatal';

// C2 — STEPS keys match NonTerminalState names exactly
type StepKeys = keyof typeof STEPS;
type C2NonTerminalNamesAreStepKeys = Expect<Extends<NonTerminalState['name'], StepKeys>>;
type C2StepKeysAreNonTerminalNames = Expect<Extends<StepKeys, NonTerminalState['name']>>;

// Terminal names are absent from STEPS
type C2DoneNotAStepKey = Expect<Extends<typeof DONE.Name, StepKeys> extends true ? false : true>;
type C2FatalNotAStepKey = Expect<Extends<typeof FATAL.Name, StepKeys> extends true ? false : true>;

// STEPS values are the per-state step factories and produce Step<SuccessorsOf<name>, …>
type C2InitStepFactory = Expect<Equals<(typeof STEPS)[typeof INIT.Name], typeof INIT.step>>;
type InitStepFromFactory = ReturnType<typeof INIT.step>;
type InitStepFromFactoryParts = InitStepFromFactory extends Step<infer TNext, infer TResponse>
  ? [TNext, TResponse]
  : never;
type C2InitStepNext = Expect<Equals<InitStepFromFactoryParts[0], SuccessorsOf<typeof INIT.Name>>>;
type C2InitStepResponse = Expect<Equals<InitStepFromFactoryParts[1], InitResponse>>;

type C2RefreshSourceStepFactory = Expect<
  Equals<(typeof STEPS)[typeof REFRESH_SOURCE.Name], typeof REFRESH_SOURCE.step>
>;
type RefreshSourceStepFromFactory = ReturnType<typeof REFRESH_SOURCE.step>;
type RefreshSourceStepFromFactoryParts = RefreshSourceStepFromFactory extends Step<
  infer TNext,
  infer TResponse
>
  ? [TNext, TResponse]
  : never;
type C2RefreshSourceStepNext = Expect<
  Equals<RefreshSourceStepFromFactoryParts[0], SuccessorsOf<typeof REFRESH_SOURCE.Name>>
>;

type InitTransitionReturn = ReturnType<typeof INIT.step> extends Step<infer TNext, infer TResponse>
  ? ReturnType<Step<TNext, TResponse>['transition']> extends StateOf<TNext>
    ? true
    : false
  : false;
type C2InitTransitionReturnsStateOfNext = Expect<InitTransitionReturn>;

export type V3DispatchTypeTests = [
  C2NonTerminalNamesAreStepKeys,
  C2StepKeysAreNonTerminalNames,
  C2DoneNotAStepKey,
  C2FatalNotAStepKey,
  C2InitStepFactory,
  C2InitStepNext,
  C2InitStepResponse,
  C2RefreshSourceStepFactory,
  C2RefreshSourceStepNext,
  C2InitTransitionReturnsStateOfNext
];

export {};
