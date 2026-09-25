/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A state-action machine driver, shared by the polling checks (node versions,
 * clock skew). A machine is its state, its actions, and its model, supplied
 * as three functions:
 *
 *   initialState  the state to start from, given the current time
 *   next          the action to run in a state, or null once the machine is done
 *   model         the transition: given a state and what its action returned,
 *                 the next state and an event saying what the step meant
 *
 * `run` drives it: wait until the state's `nextActionAt`, run the action, turn
 * any failure into an `ok: false` result, apply the model, yield. Each yielded value pairs
 * a state with the event that led to it, and the initial state carries the
 * event `{ type: 'initial' }`. This is the augmented state of Lamport,
 * "Computer Science and State Machines" (2008), p. 3: a device whose
 * transitions carry events is a state machine whose states include the last
 * event. The result of an action never leaves the model; consumers see what
 * the domain concluded, not how it asked.
 *
 * Time reaches a model only as `completedAt` on the result; a model never
 * reads a clock. That time is monotonic and only for scheduling. A domain that
 * needs wall-clock time (clock skew) reads it inside its own action.
 */

import { setTimeout as delay } from 'node:timers/promises';

export type Sleep = (duration: number, signal?: AbortSignal) => Promise<void>;

/** The clock a machine runs on. Injectable so tests can run it on virtual time. */
export interface Clock {
  readonly now: () => number;
  readonly sleep: Sleep;
}

/**
 * An action: one asynchronous thing the machine can do. It receives the
 * machine's signal so an in-flight request can be cancelled on shutdown.
 */
export type Action<R> = (signal?: AbortSignal) => Promise<R>;

/** What an action returned, and when it completed. */
export type ActionResult<R> =
  | { readonly ok: true; readonly value: R; readonly completedAt: number }
  | { readonly ok: false; readonly error: Error; readonly completedAt: number };

/** What the driver needs from a state: when its action is due. */
export interface Scheduled {
  readonly nextActionAt: number;
}

/** A domain event is a tagged union; the tag is what consumers switch on. */
export interface DomainEvent {
  readonly type: string;
}

/** The event of the initial state, which no transition led to. */
export interface InitialEvent {
  readonly type: 'initial';
}

/** A state together with the event of the transition that led to it. */
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

/**
 * Monotonic, so a wall-clock adjustment cannot move a scheduled action. The
 * unref'd timer never keeps the process alive on its own.
 */
export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (duration, signal) => delay(duration, undefined, { ref: false, signal }),
};

/**
 * The first multiple of `interval` after `completedAt`, counted from `anchor`,
 * the time the action that just ran was due. Slow actions skip the points they
 * overran instead of accumulating drift.
 */
export const nextOnGrid = (anchor: number, completedAt: number, interval: number): number =>
  anchor + (Math.floor((completedAt - anchor) / interval) + 1) * interval;

/**
 * Wait until the state's action is due, then run it once. Every failure of the
 * action, including a synchronous throw, becomes an `ok: false` result. An
 * abort during the wait throws instead, even when the injected sleep ignores
 * the signal, so `run` can stop.
 */
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

/**
 * Runs a machine. Yields the initial state, then one augmented state per step,
 * and returns the last state once `next` yields null or `signal` aborts.
 * `next` and `model` see the same state within a step, so an action may close
 * over the state it was built for. What to do with the states is the
 * consumer's concern.
 */
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
      // Only the wait can throw here; `perform` turns action failures into results.
      if (signal?.aborted) {
        return state;
      }
      throw error;
    }
    const reached = model(state, result);
    state = reached.state;
    yield reached;
  }
  return state;
}
