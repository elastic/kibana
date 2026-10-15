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
  pollEsNodesClockSkew,
  sampleClocks,
  type ClockSkew,
  type ClockSkewEvent,
  type ClockSkewSample,
  type ClockSkewState,
} from './clock_skew';
import type { ActionResult } from './state_action_machine';
import { virtualClock } from './state_action_machine.test_helpers';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
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

  it('measures a node ahead from the response, not the request', () => {
    // 60.5s after the request left, but only 59.5s after the response arrived.
    expect(classifyClockSkew(sampleAt(kibanaTime + 60_500, 1_000))).toEqual({ type: 'inSync' });
  });

  it('reports the skew from the nearer end of the round trip, so it is a lower bound', () => {
    expect(classifyClockSkew(sampleAt(kibanaTime + 62_000, 1_000))).toEqual({
      type: 'skewed',
      skew: { ms: 61_000, kibanaTime: kibanaTime + 1_000, elasticsearchTime: kibanaTime + 62_000 },
    });
  });

  it('measures nothing when the wall clock stepped back during the request', () => {
    // Stepped back 5 minutes: no node time could fall within the inverted round trip.
    const stepped = { requestedAt: kibanaTime, respondedAt: kibanaTime - 300_000 };
    expect(classifyClockSkew({ ...stepped, timestamps: [kibanaTime - 150_000] })).toEqual({
      type: 'unmeasured',
    });
  });

  it('measures nothing when no node reported a timestamp', () => {
    expect(classifyClockSkew({ ...inSync, timestamps: [] })).toEqual({ type: 'unmeasured' });
  });
});

describe('the clock skew machine', () => {
  const machine = clockSkewMachine(async () => inSync);
  const remindAt = HOUR;
  const states: Record<ClockSkewState['controlState'], ClockSkewState> = {
    healthy: machine.initialState,
    skewed: { controlState: 'skewed', remindAt },
  };
  const completed = (value: ClockSkewSample, completedAt = 0): ActionResult<ClockSkewSample> => ({
    ok: true,
    value,
    completedAt,
  });
  const results: Record<string, ActionResult<ClockSkewSample>> = {
    'a failed request': { ok: false, error: new Error('boom'), completedAt: 0 },
    'a sample measuring nothing': completed({ ...inSync, timestamps: [] }),
    'an in-sync sample': completed(inSync),
    'a skewed sample': completed(behind),
    'a skewed sample before the reminder is due': completed(behind, remindAt - 1),
    'a skewed sample once the reminder is due': completed(behind, remindAt),
  };

  // Every step waits ten minutes. A detected or reminded skew sets the next reminder an
  // hour after that check.
  it.each`
    from         | result                                          | to           | reminder     | event
    ${'healthy'} | ${'a failed request'}                           | ${'healthy'} | ${'none'}    | ${'unavailable'}
    ${'healthy'} | ${'a sample measuring nothing'}                 | ${'healthy'} | ${'none'}    | ${'unavailable'}
    ${'healthy'} | ${'an in-sync sample'}                          | ${'healthy'} | ${'none'}    | ${'inSync'}
    ${'healthy'} | ${'a skewed sample'}                            | ${'skewed'}  | ${'renewed'} | ${'skewDetected'}
    ${'skewed'}  | ${'a failed request'}                           | ${'skewed'}  | ${'kept'}    | ${'unavailable'}
    ${'skewed'}  | ${'a sample measuring nothing'}                 | ${'skewed'}  | ${'kept'}    | ${'unavailable'}
    ${'skewed'}  | ${'an in-sync sample'}                          | ${'healthy'} | ${'none'}    | ${'recovered'}
    ${'skewed'}  | ${'a skewed sample before the reminder is due'} | ${'skewed'}  | ${'kept'}    | ${'skewPersists'}
    ${'skewed'}  | ${'a skewed sample once the reminder is due'}   | ${'skewed'}  | ${'renewed'} | ${'skewReminder'}
  `(
    'when $from, $result goes to $to: $event',
    ({
      from,
      result,
      to,
      reminder,
      event,
    }: {
      from: ClockSkewState['controlState'];
      result: string;
      to: ClockSkewState['controlState'];
      reminder: 'none' | 'kept' | 'renewed';
      event: ClockSkewEvent['type'];
    }) => {
      const { completedAt } = results[result];
      const reached = {
        none: { controlState: to },
        kept: states[from],
        renewed: { controlState: to, remindAt: completedAt + HOUR },
      };

      expect(machine.model(states[from], results[result])).toEqual({
        state: reached[reminder],
        event:
          event === 'skewDetected' || event === 'skewReminder'
            ? { type: event, skew: behindBy61s }
            : { type: event },
        wait: CHECK_INTERVAL,
      });
    }
  );
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
});
