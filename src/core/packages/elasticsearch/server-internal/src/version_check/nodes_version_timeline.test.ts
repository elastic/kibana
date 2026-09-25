/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Marble-equivalent tests, without the marble scheduler.
 *
 * Instead of driving the machine through RxJS's TestScheduler (which cannot
 * pump a Promise- or generator-based source on virtual time), we run it on the
 * driver's virtual clock. The assertions then read the timeline the machine
 * produced, the instant, content, and event of each emission, which is exactly
 * what a marble diagram encodes, but as plain data.
 *
 * The sequence begins with the initial state and its initial event, so every
 * timeline starts with the STARTUP state that has no compatibility yet.
 */

import {
  nodesVersionMachine,
  type NodesVersionEvent,
  type NodesVersionConfig,
  type NodesVersionState,
} from './nodes_version';
import type { NodesInfo } from './nodes_version_compatibility';
import { run, type InitialEvent } from './state_action_machine';
import { virtualClock } from './state_action_machine.test_helpers';

const KIBANA = '8.10.0';
const baseConfig: NodesVersionConfig = {
  kibanaVersion: KIBANA,
  ignoreVersionMismatch: false,
  healthCheckInterval: 100,
  healthCheckRetry: 1,
};

const compatible: NodesInfo = { nodes: { a: { version: '8.10.0', ip: '1.1.1.1', name: 'a' } } };
const incompatible: NodesInfo = { nodes: { a: { version: '7.0.0', ip: '1.1.1.1', name: 'a' } } };
const requestError = new Error('boom');

interface Tick {
  /** The virtual instant this state was produced. */
  at: number;
  controlState: NodesVersionState['controlState'];
  isCompatible: boolean | undefined;
  event: (NodesVersionEvent | InitialEvent)['type'];
}

const initialTick: Tick = {
  at: 0,
  controlState: 'STARTUP',
  isCompatible: undefined,
  event: 'initial',
};

/** Runs the machine on a virtual clock and returns the timeline of states. */
const runTimeline = async (
  requests: Array<NodesInfo | Error>,
  config: NodesVersionConfig,
  count: number,
  requestDurations: number[] = []
): Promise<Tick[]> => {
  const clock = virtualClock();

  let i = 0;
  const request = async (): Promise<NodesInfo> => {
    const requestIndex = i++;
    const p = requests[Math.min(requestIndex, requests.length - 1)];
    clock.advance(requestDurations[requestIndex] ?? 0);
    if (p instanceof Error) {
      throw p;
    }
    return p;
  };

  const timeline: Tick[] = [];
  for await (const { state, event } of run(nodesVersionMachine(request, config), clock)) {
    timeline.push({
      at: clock.now(),
      controlState: state.controlState,
      isCompatible: state.compatibility?.isCompatible,
      event: event.type,
    });
    if (timeline.length === count) {
      break;
    }
  }
  return timeline;
};

describe('the machine on a virtual clock (marble-equivalent)', () => {
  it('yields the initial state, starts immediately, then requests on a fixed interval', async () => {
    // pollEsNodesVersion marble: 'a 99ms (b|)', a at 0, b at 100.
    const timeline = await runTimeline([compatible, incompatible], baseConfig, 3);

    expect(timeline).toEqual([
      initialTick,
      { at: 0, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 100, controlState: 'NORMAL', isCompatible: false, event: 'compatibilityChanged' },
    ]);
  });

  it('does not accumulate request duration into the regular interval', async () => {
    const timeline = await runTimeline(
      [compatible, compatible, compatible],
      baseConfig,
      4,
      [30, 30, 30]
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 30, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 130, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
      { at: 230, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
    ]);
  });

  it('skips ticks missed by a long request without starting requests in parallel', async () => {
    const timeline = await runTimeline(
      [compatible, compatible, compatible],
      baseConfig,
      4,
      [30, 250, 0]
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 30, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 350, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
      { at: 400, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
    ]);
  });

  it('uses the startup interval until the first compatible response, then normal', async () => {
    // marble: 'a 49ms b 99ms (c|)' with startup 50: a@0, b@50 (startup), c@150
    // (50 + 100 normal, after the compatible response settles NORMAL).
    const timeline = await runTimeline(
      [incompatible, compatible, compatible],
      { ...baseConfig, healthCheckStartupInterval: 50 },
      4
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 0, controlState: 'STARTUP', isCompatible: false, event: 'compatibilityChanged' },
      { at: 50, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 150, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
    ]);
  });

  it('keeps the fixed grid when a slow request changes the polling interval', async () => {
    // Upstream restarts its `interval()` when the regime changes, so it would
    // request at 230 here. The machine stays on the grid anchored at the time
    // the request that changed the regime was due: 0 + 2 * 100.
    const timeline = await runTimeline(
      [compatible, compatible],
      { ...baseConfig, healthCheckStartupInterval: 50 },
      3,
      [130, 0]
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 130, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 200, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
    ]);
  });

  it('holds the interval through a retry, then switches to the failure interval on recovery', async () => {
    // marble 'a 199ms b 29ms c 99ms (d|)': 100 poll + 100 retry, then 30
    // failure, then 100 normal. With retry:1 the second error settles FAILING.
    const timeline = await runTimeline(
      [compatible, requestError, requestError, compatible],
      { ...baseConfig, healthCheckFailureInterval: 30 },
      5
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 0, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      // request error, 1 attempt left: use it, settle nothing, request again on
      // the current (normal) grid.
      { at: 100, controlState: 'NORMAL', isCompatible: true, event: 'retried' },
      // second request error, attempts used: settle FAILING at failure interval.
      { at: 200, controlState: 'FAILING', isCompatible: false, event: 'compatibilityChanged' },
      // recovery: NORMAL, requested at 200 + 30 (failure interval).
      { at: 230, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
    ]);
  });

  it('keeps a slow failing request on the grid instead of delaying the retry by its duration', async () => {
    // The request due at 100 takes 50ms to fail. v3 and upstream would retry at
    // 150 + 100 = 250; the grid point is 200. The retry keeps the last
    // compatibility, so the compatible request that follows changes nothing.
    const timeline = await runTimeline(
      [compatible, requestError, compatible],
      baseConfig,
      4,
      [0, 50, 0]
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 0, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 150, controlState: 'NORMAL', isCompatible: true, event: 'retried' },
      { at: 200, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityUnchanged' },
    ]);
  });
});
