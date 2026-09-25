/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  classifyClockSkew,
  clockSkewMachine,
  initialState,
  model,
  pollEsNodesClockSkew,
  sampleClocks,
  type ClockSkew,
  type ClockSkewSample,
  type ClockSkewState,
} from './clock_skew';
import { run, type ActionResult } from './state_action_machine';
import { take, virtualClock } from './state_action_machine.test_helpers';

const MINUTE = 60 * 1000;
const CHECK_INTERVAL = 10 * MINUTE;
const REMINDER_INTERVAL = 60 * MINUTE;

const kibanaTime = Date.parse('2026-08-21T12:00:00.000Z');
const sampleAt = (elasticsearchTime: number, latency = 0): ClockSkewSample => ({
  requestedAt: kibanaTime,
  respondedAt: kibanaTime + latency,
  timestamps: [elasticsearchTime],
});
const inSync = sampleAt(kibanaTime);
const behind = sampleAt(kibanaTime - 61_000);
const behindBy61s: ClockSkew = {
  ms: 61_000,
  kibanaTime,
  elasticsearchTime: kibanaTime - 61_000,
};

const ok = (value: ClockSkewSample, completedAt = 0): ActionResult<ClockSkewSample> => ({
  ok: true,
  value,
  completedAt,
});
const fail = (completedAt = 0): ActionResult<ClockSkewSample> => ({
  ok: false,
  error: new Error('boom'),
  completedAt,
});

describe('classifyClockSkew', () => {
  it('reports Elasticsearch behind Kibana by more than the tolerance', () => {
    expect(classifyClockSkew(behind)).toEqual({ type: 'skewed', skew: behindBy61s });
  });

  it('reports Elasticsearch ahead of Kibana by more than the tolerance', () => {
    expect(classifyClockSkew(sampleAt(kibanaTime + 61_000))).toEqual({
      type: 'skewed',
      skew: { ms: 61_000, kibanaTime, elasticsearchTime: kibanaTime + 61_000 },
    });
  });

  it('is in sync at exactly the tolerance', () => {
    expect(classifyClockSkew(sampleAt(kibanaTime - 60_000))).toEqual({ type: 'inSync' });
  });

  it('is in sync when request latency explains the difference', () => {
    expect(classifyClockSkew(sampleAt(kibanaTime + 500, 61_000))).toEqual({ type: 'inSync' });
  });

  it('is in sync when no node reported a timestamp', () => {
    expect(classifyClockSkew({ ...inSync, timestamps: [] })).toEqual({ type: 'inSync' });
  });
});

describe('model', () => {
  const healthy: ClockSkewState = initialState(0);
  const skewed: ClockSkewState = { controlState: 'skewed', nextActionAt: 0 };

  it('checks every ten minutes while healthy, and says so quietly', () => {
    expect(model(healthy, ok(inSync))).toEqual({
      state: { controlState: 'healthy', nextActionAt: CHECK_INTERVAL },
      event: { type: 'inSync' },
    });
  });

  it('detects skew, then reminds every hour', () => {
    expect(model(healthy, ok(behind))).toEqual({
      state: { controlState: 'skewed', nextActionAt: REMINDER_INTERVAL },
      event: { type: 'skewDetected', skew: behindBy61s },
    });
  });

  it('reports skew that persists as such', () => {
    expect(model(skewed, ok(behind))).toEqual({
      state: { controlState: 'skewed', nextActionAt: REMINDER_INTERVAL },
      event: { type: 'skewPersists', skew: behindBy61s },
    });
  });

  it('recovers to ten-minute checks on an in-sync sample', () => {
    expect(model(skewed, ok(inSync))).toEqual({
      state: { controlState: 'healthy', nextActionAt: CHECK_INTERVAL },
      event: { type: 'recovered' },
    });
  });

  it('keeps the state and its interval when the request fails', () => {
    expect(model(healthy, fail())).toEqual({
      state: { ...healthy, nextActionAt: CHECK_INTERVAL },
      event: { type: 'unavailable' },
    });
    expect(model(skewed, fail())).toEqual({
      state: { ...skewed, nextActionAt: REMINDER_INTERVAL },
      event: { type: 'unavailable' },
    });
  });

  it('stays on the grid anchored at the time the action was due', () => {
    const late = model({ ...healthy, nextActionAt: 1_000 }, ok(inSync, 1_000 + CHECK_INTERVAL + 1));
    expect(late.state.nextActionAt).toBe(1_000 + 2 * CHECK_INTERVAL);
  });
});

describe('the machine on a virtual clock', () => {
  it('checks at startup, reminds hourly while skewed, resumes ten-minute checks on recovery', async () => {
    const clock = virtualClock();
    const samples = [behind, behind, inSync, inSync];
    let i = 0;
    const action = async () => samples[Math.min(i++, samples.length - 1)];

    const steps = await take(run(clockSkewMachine(action), clock), 5);

    expect(
      steps.map(({ state: { controlState, nextActionAt }, event }) => [
        controlState,
        nextActionAt,
        event.type,
      ])
    ).toEqual([
      ['healthy', 0, 'initial'],
      ['skewed', REMINDER_INTERVAL, 'skewDetected'],
      ['skewed', 2 * REMINDER_INTERVAL, 'skewPersists'],
      ['healthy', 2 * REMINDER_INTERVAL + CHECK_INTERVAL, 'recovered'],
      ['healthy', 2 * REMINDER_INTERVAL + 2 * CHECK_INTERVAL, 'inSync'],
    ]);
  });
});

describe('sampleClocks', () => {
  afterEach(() => jest.restoreAllMocks());

  it('brackets the request with the wall clock and collects the timestamps nodes report', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.stats.mockResolvedValue({
      nodes: { a: { timestamp: 1 }, b: {}, c: { timestamp: 3 } },
    } as never);
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(kibanaTime)
      .mockReturnValueOnce(kibanaTime + 40);
    const signal = new AbortController().signal;

    const sample = await sampleClocks(internalClient)(signal);

    expect(sample).toEqual({
      requestedAt: kibanaTime,
      respondedAt: kibanaTime + 40,
      timestamps: [1, 3],
    });
    expect(internalClient.nodes.stats).toHaveBeenCalledWith(
      { node_id: '_all', metric: 'os', filter_path: ['nodes.*.timestamp'] },
      { requestTimeout: expect.any(Number), signal }
    );
  });
});

describe('pollEsNodesClockSkew', () => {
  const log = loggingSystemMock.createLogger();
  let internalClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    internalClient = elasticsearchClientMock.createInternalClient();
    jest.spyOn(Date, 'now').mockReturnValue(kibanaTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const statsResponse = (timestamp: number) => ({ nodes: { 'node-0': { timestamp } } });

  /** Answers each request from `responses` (the last repeating), aborts after the last, and returns the virtual stop time. */
  const runRequests = async (responses: Array<() => Promise<unknown>>): Promise<number> => {
    const controller = new AbortController();
    let calls = 0;
    internalClient.nodes.stats.mockImplementation((async () => {
      const respond = responses[Math.min(calls, responses.length - 1)];
      if (++calls === responses.length) {
        controller.abort();
      }
      return respond();
    }) as never);

    const clock = virtualClock();
    await pollEsNodesClockSkew({ internalClient, log, signal: controller.signal }, clock);
    return clock.now();
  };

  const respond = (timestamp: number) => async () => statsResponse(timestamp);

  it('checks on startup, logs skew once, reminds hourly, and logs recovery once', async () => {
    const stoppedAt = await runRequests([
      respond(kibanaTime - 61_000),
      respond(kibanaTime - 61_000),
      respond(kibanaTime),
      respond(kibanaTime),
    ]);

    expect(internalClient.nodes.stats).toHaveBeenCalledTimes(4);
    expect(internalClient.nodes.stats).toHaveBeenCalledWith(
      { node_id: '_all', metric: 'os', filter_path: ['nodes.*.timestamp'] },
      { requestTimeout: expect.any(Number), signal: expect.any(AbortSignal) }
    );
    // Reminder interval twice while skewed, then one check interval once healthy.
    expect(stoppedAt).toBe(2 * REMINDER_INTERVAL + CHECK_INTERVAL);
    expect(log.error.mock.calls).toEqual([
      [
        'Kibana and Elasticsearch clocks are out of sync by at least 61000ms. Kibana time: 2026-08-21T12:00:00.000Z; Elasticsearch time: 2026-08-21T11:58:59.000Z.',
      ],
      [
        'Kibana and Elasticsearch clocks are still out of sync by at least 61000ms. Kibana time: 2026-08-21T12:00:00.000Z; Elasticsearch time: 2026-08-21T11:58:59.000Z.',
      ],
    ]);
    expect(log.info.mock.calls).toEqual([['Kibana and Elasticsearch clocks are in sync again.']]);
  });

  it('swallows request failures', async () => {
    await runRequests([
      async () => {
        throw new Error('mock stats request error');
      },
    ]);

    expect(log.error).not.toHaveBeenCalled();
    expect(log.info).not.toHaveBeenCalled();
  });
});
