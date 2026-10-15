/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs state-action machines: `next` picks the action for a state, and a pure
 * `model` turns the state and the action's result into a step: the next state,
 * an event describing it (Lamport's augmented state), and how long to wait
 * before the next action. Models never read a clock; time arrives as the
 * result's `completedAt`.
 */

import { setTimeout as wait } from 'node:timers/promises';

/** Resolves after `duration`, or early once `signal` aborts; never rejects. */
export type Sleep = (duration: number, signal?: AbortSignal) => Promise<void>;

/** Injectable so tests can run a machine on virtual time. */
export interface Clock {
  readonly now: () => number;
  readonly sleep: Sleep;
}

export type Action<R> = (signal?: AbortSignal) => Promise<R>;

export type ActionResult<R> =
  | { readonly ok: true; readonly value: R; readonly completedAt: number }
  | { readonly ok: false; readonly error: Error; readonly completedAt: number };

export interface InitialEvent {
  readonly type: 'initial';
}

/** A state and the event of the step that led to it. */
export interface AugmentedState<S, E> {
  readonly state: S;
  readonly event: E;
}

export interface Step<S, E> extends AugmentedState<S, E> {
  /** How long to wait before the next action; zero acts at once. */
  readonly wait: number;
}

export interface StateActionMachine<S, R, E> {
  readonly initialState: S;
  /** The action to run in `state`, or null once the machine is done. */
  readonly next: (state: S) => Action<R> | null;
  readonly model: (state: S, result: ActionResult<R>) => Step<S, E>;
}

/** Monotonic, so wall-clock adjustments don't move waits; unref'd, so it never holds the process open. */
export const realClock: Clock = {
  now: () => performance.now(),
  // `wait` rejects only when `signal` aborts.
  sleep: (duration, signal) =>
    wait(duration, undefined, { ref: false, signal }).catch(() => undefined),
};

/** Performs the action and stamps its completion; a failure becomes a result too. */
const attempt = async <R>(
  perform: Action<R>,
  now: Clock['now'],
  signal?: AbortSignal
): Promise<ActionResult<R>> => {
  try {
    const value = await perform(signal);
    return { ok: true, value, completedAt: now() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      completedAt: now(),
    };
  }
};

/**
 * Yields the initial step, which acts at once, and then each step, until `next` returns
 * null or `signal` aborts. Returns the last state.
 */
export async function* run<S, R, E>(
  { initialState, next, model }: StateActionMachine<S, R, E>,
  clock: Clock = realClock,
  signal?: AbortSignal
): AsyncGenerator<Step<S, E | InitialEvent>, S> {
  let step: Step<S, E | InitialEvent> = {
    state: initialState,
    event: { type: 'initial' },
    wait: 0,
  };

  yield step;
  while (!signal?.aborted) {
    const { state } = step;
    const action = next(state);
    if (action === null) {
      return state;
    }
    if (step.wait > 0) {
      await clock.sleep(step.wait, signal);
    }
    if (signal?.aborted) {
      return state;
    }
    const result = await attempt(action, clock.now, signal);
    if (signal?.aborted) {
      // Drop a result that arrived after the abort.
      return state;
    }
    step = model(state, result);
    yield step;
  }
  return step.state;
}
