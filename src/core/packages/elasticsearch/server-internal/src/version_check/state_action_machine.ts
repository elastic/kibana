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
 * `model` turns the state and the action's result into the next state and an
 * event describing the step (Lamport's augmented state). Models never read a
 * clock; time arrives as the result's `completedAt`. The driver decides when
 * each action runs.
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

/** What `run` yields: an augmented state and when the next action is due, if `next` returns one. */
export type Step<S, E> = AugmentedState<S, E> & { readonly dueAt: number };

export interface StateActionMachine<S, R, E> {
  readonly initialState: S;
  /** The action to run in `state`, or null once the machine is done. */
  readonly next: (state: S) => Action<R> | null;
  readonly model: (state: S, result: ActionResult<R>) => AugmentedState<S, E>;
  /** How long after an action completes the next is due, for the state it reached. Zero is due at once. */
  readonly delay: (state: S) => number;
}

/** Monotonic, so wall-clock adjustments don't move schedules; unref'd, so it never holds the process open. */
export const realClock: Clock = {
  now: () => performance.now(),
  // `wait` rejects only when `signal` aborts.
  sleep: (duration, signal) =>
    wait(duration, undefined, { ref: false, signal }).catch(() => undefined),
};

/** Runs the action and stamps its completion; a failure becomes a result too. */
const perform = async <R>(
  action: Action<R>,
  now: Clock['now'],
  signal?: AbortSignal
): Promise<ActionResult<R>> => {
  try {
    const value = await action(signal);
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
 * Yields the initial step, due at once, and then each step, until `next` returns null or
 * `signal` aborts. Returns the last domain state; its deadline is on the last yielded step.
 */
export async function* run<S, R, E>(
  { initialState, next, model, delay }: StateActionMachine<S, R, E>,
  clock: Clock = realClock,
  signal?: AbortSignal
): AsyncGenerator<Step<S, E | InitialEvent>, S> {
  let state = initialState;
  let dueAt = clock.now();

  yield { state, event: { type: 'initial' }, dueAt };
  while (!signal?.aborted) {
    const action = next(state);
    if (action === null) {
      return state;
    }
    const waitMs = dueAt - clock.now();
    if (waitMs > 0) {
      await clock.sleep(waitMs, signal);
    }
    if (signal?.aborted) {
      return state;
    }
    const result = await perform(action, clock.now, signal);
    if (signal?.aborted) {
      // Drop a result that arrived after the abort.
      return state;
    }
    const reached = model(state, result);
    dueAt = result.completedAt + delay(reached.state);
    state = reached.state;
    yield { ...reached, dueAt };
  }
  return state;
}
