/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A state-action machine driver. A machine is an `initialState`, a `next` that
 * picks the action for a state, and a pure `model` that turns a state and its
 * action's result into the next state plus an event describing the step
 * (Lamport's augmented state, "Computer Science and State Machines", 2008).
 * Models never read a clock; time arrives as the result's `completedAt`.
 */

import { setTimeout as delay } from 'node:timers/promises';

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

export interface Scheduled {
  readonly nextActionAt: number;
}

export interface DomainEvent {
  readonly type: string;
}

export interface InitialEvent {
  readonly type: 'initial';
}

/** A state and the event of the step that led to it. */
export interface AugmentedState<S, E> {
  readonly state: S;
  readonly event: E;
}

export interface StateActionMachine<S extends Scheduled, R, E extends DomainEvent> {
  readonly initialState: (now: number) => S;
  /** The action to run in `state`, or null once the machine is done. */
  readonly next: (state: S) => Action<R> | null;
  readonly model: (state: S, result: ActionResult<R>) => AugmentedState<S, E>;
}

/** Monotonic, so wall-clock adjustments don't move schedules; unref'd, so it never holds the process open. */
export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (duration, signal) => delay(duration, undefined, { ref: false, signal }),
};

/**
 * The first point on the `interval` grid from `anchor` (when the last action was due)
 * that is after both `anchor` and `completedAt`; with a zero interval, `completedAt`.
 */
export const nextOnGrid = (anchor: number, completedAt: number, interval: number): number =>
  interval > 0
    ? anchor + Math.max(1, Math.floor((completedAt - anchor) / interval) + 1) * interval
    : completedAt;

/** Waits until the action is due and runs it; action failures become results, an abort throws. */
const perform = async <R>(
  action: Action<R>,
  state: Scheduled,
  { now, sleep }: Clock,
  signal?: AbortSignal
): Promise<ActionResult<R>> => {
  const waitMs = state.nextActionAt - now();
  if (waitMs > 0) {
    await sleep(waitMs, signal);
  }
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('aborted');
  }
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

/** Yields the initial state and then each step, until `next` returns null or `signal` aborts. */
export async function* run<S extends Scheduled, R, E extends DomainEvent>(
  { initialState, next, model }: StateActionMachine<S, R, E>,
  clock: Clock = realClock,
  signal?: AbortSignal
): AsyncGenerator<AugmentedState<S, E | InitialEvent>, S> {
  let state = initialState(clock.now());

  yield { state, event: { type: 'initial' } };
  while (!signal?.aborted) {
    const action = next(state);
    if (action === null) {
      return state;
    }
    let result: ActionResult<R>;
    try {
      result = await perform(action, state, clock, signal);
    } catch (error) {
      if (signal?.aborted) {
        return state;
      }
      throw error;
    }
    if (signal?.aborted) {
      // Drop a result that arrived after the abort.
      return state;
    }
    const reached = model(state, result);
    state = reached.state;
    yield reached;
  }
  return state;
}
