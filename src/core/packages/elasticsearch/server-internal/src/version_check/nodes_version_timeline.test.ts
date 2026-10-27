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
 * when requests completed, what state and event they led to, and when the
 * next request is due.
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
  healthCheckFailureInterval: 100,
  healthCheckStartupInterval: 100,
  healthCheckRetry: 1,
};

const compatible: NodesInfo = { nodes: { a: { version: '8.10.0', ip: '1.1.1.1', name: 'a' } } };
const incompatible: NodesInfo = { nodes: { a: { version: '7.0.0', ip: '1.1.1.1', name: 'a' } } };
const requestError = new Error('boom');

interface Tick {
  /** The virtual instant this state was produced. */
  at: number;
  /** When the next request is due: `at` plus the step's wait. */
  dueAt: number;
  controlState: NodesVersionState['controlState'];
  isCompatible: boolean | undefined;
  event: (NodesVersionEvent | InitialEvent)['type'];
}

/** A row of the timeline: when it happened, when the next request is due, and what it led to. */
const tick = (
  at: number,
  dueAt: number,
  controlState: Tick['controlState'],
  isCompatible: boolean | undefined,
  event: Tick['event']
): Tick => ({ at, dueAt, controlState, isCompatible, event });

const initialTick = tick(0, 0, 'STARTUP', undefined, 'initial');

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
  for await (const { state, event, wait } of run(nodesVersionMachine(request, config), clock)) {
    const at = clock.now();
    timeline.push(
      tick(at, at + wait, state.controlState, state.compatibility?.isCompatible, event.type)
    );
    if (timeline.length === count) {
      break;
    }
  }
  return timeline;
};

describe('the version machine on a virtual clock', () => {
  it('waits the interval after each request completes, so request time adds to the period', async () => {
    const timeline = await runTimeline(
      [compatible, compatible, compatible],
      baseConfig,
      4,
      [30, 30, 30]
    );

    expect(timeline).toEqual([
      initialTick,
      tick(30, 130, 'NORMAL', true, 'compatibilityChanged'),
      tick(160, 260, 'NORMAL', true, 'compatibilityUnchanged'),
      tick(290, 390, 'NORMAL', true, 'compatibilityUnchanged'),
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
      tick(0, 50, 'STARTUP', false, 'compatibilityChanged'),
      tick(50, 150, 'NORMAL', true, 'compatibilityChanged'),
      tick(150, 250, 'NORMAL', true, 'compatibilityUnchanged'),
    ]);
  });

  it('holds the interval through a retry, uses the failure interval once the error settles, and the normal interval again on recovery', async () => {
    // With retry: 1, the first error retries after the normal interval and the second settles FAILING.
    const timeline = await runTimeline(
      [compatible, requestError, requestError, compatible],
      { ...baseConfig, healthCheckFailureInterval: 30 },
      5
    );

    expect(timeline).toEqual([
      initialTick,
      tick(0, 100, 'NORMAL', true, 'compatibilityChanged'),
      tick(100, 200, 'NORMAL', true, 'retried'),
      tick(200, 230, 'FAILING', false, 'compatibilityChanged'),
      tick(230, 330, 'NORMAL', true, 'compatibilityChanged'),
    ]);
  });

  it('polls at the startup interval while the cluster is unreachable at startup', async () => {
    // With retry: 1, every second error settles; it is still STARTUP, so still the startup interval.
    const timeline = await runTimeline(
      [requestError, requestError, requestError, compatible],
      { ...baseConfig, healthCheckStartupInterval: 50, healthCheckFailureInterval: 30 },
      5
    );

    expect(timeline).toEqual([
      initialTick,
      tick(0, 50, 'STARTUP', undefined, 'retried'),
      tick(50, 100, 'STARTUP', false, 'compatibilityChanged'),
      tick(100, 150, 'STARTUP', false, 'retried'),
      tick(150, 250, 'NORMAL', true, 'compatibilityChanged'),
    ]);
  });
});
