/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  nextOnGrid,
  run,
  type Action,
  type AugmentedState,
  type StateActionMachine,
  type ActionResult,
  type Scheduled,
} from './state_action_machine';
import { take, virtualClock } from './state_action_machine.test_helpers';

describe('nextOnGrid', () => {
  it('schedules the next grid point after a completion at the due time', () => {
    expect(nextOnGrid(1_000, 1_000, 100)).toBe(1_100);
  });

  it('stays on the grid when the request overran part of an interval', () => {
    expect(nextOnGrid(1_000, 1_040, 100)).toBe(1_100);
  });

  it('skips the grid points a slow request overran', () => {
    expect(nextOnGrid(1_000, 1_250, 100)).toBe(1_300);
  });

  it('never schedules on or before the completion', () => {
    expect(nextOnGrid(1_000, 1_100, 100)).toBe(1_200);
  });
});

describe('run turns every failure of an action into an ok: false result', () => {
  /** A machine whose event is the raw result, so the failure handling is observable. */
  interface Recorded<R> {
    readonly type: 'performed';
    readonly result: ActionResult<R>;
  }
  const recorder = <R>(
    action: Action<R>,
    dueAt = 0
  ): StateActionMachine<Scheduled, R, Recorded<R>> => ({
    initialState: () => ({ nextActionAt: dueAt }),
    next: () => action,
    model: (state, result) => ({ state, event: { type: 'performed', result } }),
  });

  const resultOf = async <R>(
    machine: StateActionMachine<Scheduled, R, Recorded<R>>,
    clock = virtualClock()
  ) => {
    const [, step] = await take(run(machine, clock), 2);
    return step.event.type === 'performed' ? step.event.result : undefined;
  };

  it('turns a synchronous throw from the action into a result', async () => {
    const throwsSynchronously = (): Promise<never> => {
      throw new Error('sync boom');
    };
    expect(await resultOf(recorder(throwsSynchronously))).toEqual({
      ok: false,
      error: new Error('sync boom'),
      completedAt: 0,
    });
  });

  it('turns a rejection into a result', async () => {
    const rejects = () => Promise.reject<never>(new Error('async boom'));
    expect(await resultOf(recorder(rejects))).toEqual({
      ok: false,
      error: new Error('async boom'),
      completedAt: 0,
    });
  });

  it('wraps a non-Error rejection reason', async () => {
    const rejects = () => Promise.reject<never>('boom');
    const result = await resultOf(recorder(rejects));

    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('boom');
    }
  });

  it('waits until the action is due and stamps the completion', async () => {
    const clock = virtualClock(10);
    const action = async () => {
      clock.advance(5);
      return 'value';
    };
    expect(await resultOf(recorder(action, 100), clock)).toEqual({
      ok: true,
      value: 'value',
      completedAt: 105,
    });
  });
});

describe('run', () => {
  interface Counter extends Scheduled {
    readonly count: number;
  }
  /** The domain's account of a step: what the request added, or that it added nothing. */
  type Counted = { readonly type: 'added'; readonly by: number } | { readonly type: 'missed' };

  const counter = (
    request: Action<number>,
    until = Infinity
  ): StateActionMachine<Counter, number, Counted> => ({
    initialState: (now) => ({ count: 0, nextActionAt: now }),
    // The next-action predicate: the one request, until the count is reached.
    next: (state) => (state.count >= until ? null : request),
    model: (state, result): AugmentedState<Counter, Counted> => ({
      state: {
        count: result.ok ? state.count + result.value : state.count,
        nextActionAt: nextOnGrid(state.nextActionAt, result.completedAt, 100),
      },
      event: result.ok ? { type: 'added', by: result.value } : { type: 'missed' },
    }),
  });

  it('yields the initial state, then one augmented state per action, with the event the model chose', async () => {
    const clock = virtualClock();
    let calls = 0;
    const request = async () => {
      if (++calls === 2) {
        throw new Error('boom');
      }
      return 1;
    };

    const steps = await take(run(counter(request), clock), 3);

    expect(steps).toEqual([
      { state: { count: 0, nextActionAt: 0 }, event: { type: 'initial' } },
      { state: { count: 1, nextActionAt: 100 }, event: { type: 'added', by: 1 } },
      { state: { count: 1, nextActionAt: 200 }, event: { type: 'missed' } },
    ]);
  });

  it('does not act until the states are pulled', async () => {
    const request = jest.fn(async () => 1);
    const clock = virtualClock();
    const steps = run(counter(request), clock);

    expect(request).not.toHaveBeenCalled();
    await steps.next(); // the initial state
    expect(request).not.toHaveBeenCalled();
    await steps.next();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('terminates with the final state once next yields no action', async () => {
    const clock = virtualClock();
    const steps = run(
      counter(async () => 1, 2),
      clock
    );
    const seen: Array<AugmentedState<Counter, Counted | { type: 'initial' }>> = [];

    let pulled = await steps.next();
    while (!pulled.done) {
      seen.push(pulled.value);
      pulled = await steps.next();
    }

    expect(seen.map(({ state }) => state.count)).toEqual([0, 1, 2]);
    expect(pulled.value).toEqual({ count: 2, nextActionAt: 200 });
  });

  it('returns once aborted, even with a sleep that ignores the signal', async () => {
    const controller = new AbortController();
    let requests = 0;
    const request = async () => {
      if (++requests === 2) {
        controller.abort();
      }
      return 1;
    };
    const clock = virtualClock();

    const counts: number[] = [];
    for await (const { state } of run(counter(request), clock, controller.signal)) {
      counts.push(state.count);
    }

    expect(requests).toBe(2);
    expect(counts).toEqual([0, 1, 2]);
  });

  it('hands the signal to the action, so an in-flight request can be cancelled', async () => {
    const controller = new AbortController();
    const seen: Array<AbortSignal | undefined> = [];
    const request: Action<number> = async (signal) => {
      seen.push(signal);
      return 1;
    };

    await take(run(counter(request), virtualClock(), controller.signal), 2);

    expect(seen).toEqual([controller.signal]);
  });

  it('does not act once aborted during a wait, even with a sleep that ignores the signal', async () => {
    const controller = new AbortController();
    const request = jest.fn(async () => 1);
    // Sleeps ignore the signal and cannot reject, as a virtual clock does; the
    // abort lands while the machine is waiting.
    const clock = { now: () => 0, sleep: async () => controller.abort() };

    const steps = run(counter(request, Infinity), clock, controller.signal);
    await steps.next(); // the initial state
    await steps.next(); // the first request, due at once, scheduling the next at 100
    const pending = steps.next(); // waits for 100; the sleep aborts

    await expect(pending).resolves.toEqual({ done: true, value: { count: 1, nextActionAt: 100 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('returns the last state once aborted during a wait', async () => {
    const controller = new AbortController();
    const sleepUntilAborted = (_: number, signal?: AbortSignal) =>
      new Promise<void>((_resolve, reject) =>
        signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      );
    const clock = { now: () => 0, sleep: sleepUntilAborted };

    const steps = run(
      counter(async () => 1),
      clock,
      controller.signal
    );
    await steps.next(); // the initial state, due at once
    await steps.next(); // the first request, scheduling the next at 100
    const pending = steps.next(); // waits for 100 on a clock that never advances
    controller.abort();

    await expect(pending).resolves.toEqual({
      done: true,
      value: { count: 1, nextActionAt: 100 },
    });
  });
});
