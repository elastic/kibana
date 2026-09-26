/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The version machine on a virtual clock: each test asserts the timeline of
 * when requests completed and what state and event they led to.
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

describe('the version machine on a virtual clock', () => {
  it('yields the initial state, starts immediately, then requests on a fixed interval', async () => {
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
    // Startup interval 50 until the response at 50 is compatible, then normal 100.
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
    // The request due at 0 takes 130ms and switches to the normal interval. The
    // next request stays on the grid from 0 (at 200), not 100ms after completion.
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
    // With retry: 1, the first error retries on the normal grid and the second settles FAILING.
    const timeline = await runTimeline(
      [compatible, requestError, requestError, compatible],
      { ...baseConfig, healthCheckFailureInterval: 30 },
      5
    );

    expect(timeline).toEqual([
      initialTick,
      { at: 0, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
      { at: 100, controlState: 'NORMAL', isCompatible: true, event: 'retried' },
      { at: 200, controlState: 'FAILING', isCompatible: false, event: 'compatibilityChanged' },
      { at: 230, controlState: 'NORMAL', isCompatible: true, event: 'compatibilityChanged' },
    ]);
  });

  it('keeps a slow failing request on the grid instead of delaying the retry by its duration', async () => {
    // The request due at 100 takes 50ms to fail; the retry is due at 200, not 250.
    // The retry keeps the last compatibility, so the next success changes nothing.
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
