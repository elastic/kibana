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
  pollEsNodesClockSkew,
  sampleClocks,
  type ClockSkew,
  type ClockSkewSample,
} from './clock_skew';
import { virtualClock } from './state_action_machine.test_helpers';

const MINUTE = 60 * 1000;
const CHECK_INTERVAL = 10 * MINUTE;

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

  it('measures nothing when no node reported a timestamp', () => {
    expect(classifyClockSkew({ ...inSync, timestamps: [] })).toEqual({ type: 'unmeasured' });
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

  /** Answers each request from `responses`; the request after the last response aborts the check. Returns the virtual stop time. */
  const runRequests = async (responses: Array<() => Promise<unknown>>): Promise<number> => {
    const controller = new AbortController();
    let calls = 0;
    internalClient.nodes.stats.mockImplementation((async () => {
      if (calls === responses.length) {
        controller.abort(); // this result arrives after the abort and is dropped
      }
      return responses[Math.min(calls++, responses.length - 1)]();
    }) as never);

    const clock = virtualClock();
    await pollEsNodesClockSkew({ internalClient, log, signal: controller.signal }, clock);
    return clock.now();
  };

  const respond = (timestamp: number) => async () => statsResponse(timestamp);

  it('checks every ten minutes, logs skew once, reminds after an hour, and logs recovery once', async () => {
    const stoppedAt = await runRequests([
      ...Array<() => Promise<unknown>>(7).fill(respond(kibanaTime - 61_000)),
      respond(kibanaTime),
      respond(kibanaTime),
    ]);

    expect(internalClient.nodes.stats).toHaveBeenCalledTimes(10);
    expect(stoppedAt).toBe(9 * CHECK_INTERVAL);
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

  it.each([
    [
      'a failed request',
      async () => {
        throw new Error('mock stats request error');
      },
    ],
    ['a response without timestamps', async () => ({ nodes: { 'node-0': {} } })],
  ])('does not treat %s while skewed as a recovery', async (_, interruption) => {
    await runRequests([respond(kibanaTime - 61_000), interruption, respond(kibanaTime - 61_000)]);

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.info).not.toHaveBeenCalled();
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
