/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Expect, Equals } from './type_test_helpers';
import type { StateOf } from '../state';
import { transitionTo } from '../state';
import type { runStep } from '../types';
import { type Step, type SuccessorsOf } from '../types';
import type { InitResponse } from '../io';
import type * as INIT from '../steps/init';
import * as FATAL from '../steps/fatal';

declare const initState: INIT.State;

// T3 — transitionTo returns StateOf<to>
void transitionTo(initState, FATAL.Name, {
  reason: 'type-test',
});

// T1 — Step.transition returns StateOf<TNext>, not widened State
type FatalNext = 'FATAL';
type FatalStep = Step<FatalNext, { readonly type: 'fatal' }>;

const fatalStep: FatalStep = {
  action: async () => ({ type: 'fatal' as const }),
  transition: () => transitionTo(initState, FATAL.Name, { reason: 'inline fatal step' }),
};

void fatalStep.transition({
  type: 'fatal',
});

// T5 / §5.5 — runStep preserves per-step typing
type InitNext = SuccessorsOf<'INIT'>;

declare const initStep: Step<InitNext, InitResponse>;

type RunInitResult = ReturnType<typeof runStep<InitNext, InitResponse>> extends Promise<infer R>
  ? R
  : never;

type T5RunStepPreservesNext = Expect<Equals<RunInitResult, StateOf<InitNext>>>;

export type V3TransitionsTypeTests = [T5RunStepPreservesNext];

export {};
