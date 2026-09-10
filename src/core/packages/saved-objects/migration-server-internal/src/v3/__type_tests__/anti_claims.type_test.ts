/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import type { State } from '../state';
import { transitionTo } from '../state';
import type { PostInitState } from '../migration_state';
import type { Step, SuccessorsOf } from '../types';
import type { InitResponse, RefreshSourceResponse } from '../io';
import { assertNever } from '../assert_never';
import { STEPS } from '../successors';
import type { NonTerminalState } from '../state';
import * as INIT from '../steps/init';
import type * as REFRESH_SOURCE from '../steps/refresh_source';
import * as WAIT_FOR_YELLOW_SOURCE from '../steps/wait_for_yellow_source';
import * as DONE from '../steps/done';
import * as FATAL from '../steps/fatal';

declare const initState: INIT.State;
declare const refreshSourceState: REFRESH_SOURCE.State;
declare const refreshSourceResponse: RefreshSourceResponse;

// A1 / T2 / §5.2 — transition cannot target a non-successor state
const badStep: Step<SuccessorsOf<typeof REFRESH_SOURCE.Name>, RefreshSourceResponse> = {
  action: async () => refreshSourceResponse,
  transition: () =>
    // @ts-expect-error INIT is not in SUCCESSORS[REFRESH_SOURCE]
    transitionTo(refreshSourceState, INIT.Name, { reason: 'illegal jump' }),
};
void badStep;

// A4 / §5.3 — transitionTo cannot omit required extras
// @ts-expect-error post-init fields required in extras when not already on from
transitionTo(initState, WAIT_FOR_YELLOW_SOURCE.Name, {});

// A5 — transitionTo cannot repeat fields already on from in extras
declare const postInitState: PostInitState;
transitionTo(postInitState, FATAL.Name, {
  reason: 'duplicate field in extras',
  // @ts-expect-error sourceIndex is already on from and must not appear in extras
  sourceIndex: Option.none,
});

// A6 — incomplete response switch must not reach assertNever
const incompleteInitResponseHandling = (response: InitResponse): void => {
  switch (response.type) {
    case 'wait_for_migration_completion':
      break;
  }
  // @ts-expect-error response is not narrowed to never after incomplete switch
  assertNever(response);
};
void incompleteInitResponseHandling;

// A7 — Step.transition return cannot be widened to State
const widenedInitStep: Step<SuccessorsOf<typeof INIT.Name>, InitResponse> = {
  action: async () => ({ type: 'fatal' as const, reason: 'widened' }),
  transition: (response): State =>
    // @ts-expect-error transition return must be StateOf<Successors>, not State
    transitionTo(initState, FATAL.Name, { reason: 'widened return type' }),
};
void widenedInitStep;

// A8 — terminal states cannot be added to STEPS
const illegalStepsWithDone = {
  ...STEPS,
  // @ts-expect-error DONE is terminal and must not appear in STEPS
  [DONE.Name]: INIT.step,
} satisfies Record<NonTerminalState['name'], unknown>;
void illegalStepsWithDone;

const illegalStepsWithFatal = {
  ...STEPS,
  // @ts-expect-error FATAL is terminal and must not appear in STEPS
  [FATAL.Name]: INIT.step,
} satisfies Record<NonTerminalState['name'], unknown>;
void illegalStepsWithFatal;

// A9 — assertNever rejects non-never values
// @ts-expect-error assertNever requires never, not string
assertNever('oops' as string);

const assertNeverAfterIncompleteNarrowing = (response: InitResponse): void => {
  if (response.type === 'fatal') {
    return;
  }
  // @ts-expect-error response is not never after partial narrowing
  assertNever(response);
};
void assertNeverAfterIncompleteNarrowing;

/**
 * A2 — Adding a state to `State` without a `SUCCESSORS` row is enforced at compile
 * time by `SUCCESSORS satisfies Record<StateName, …>` in `successors.ts`. To
 * regression-test: add a variant to `State` without updating `SUCCESSORS` and
 * confirm package `type_check` fails.
 *
 * A3 — Adding a non-terminal state without a `STEPS` entry is enforced by
 * `STEPS satisfies Record<NonTerminalState['name'], …>` in `successors.ts`.
 * Same manual regression as A2.
 */

export {};
