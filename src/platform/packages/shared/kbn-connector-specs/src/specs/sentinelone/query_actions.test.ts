/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { timers } from './client';
import { SentinelOne } from './sentinelone';

const CONSOLE = 'https://tenant.sentinelone.net';
const SDL = `${CONSOLE}/sdl/v2/api`;
const TOKEN = 'unit-test-token';
const BEARER = `Bearer ${TOKEN}`;
const TAG = 'Kt7sUZeZS3x3PN3Am7Nb3zyuL3py4cE_wJfXNm/13uM-';
const TAG_2 = 'Kt7sUZeZS3x3PN3Am7Nb3/KiXzmdEzJR4sDkrJKeWiE-';
const QUERY_ID =
  'v2.eyJ0eXBlIjoiUFEiLCJ0b2tlbiI6IjNjMjVkMTFiLTk2ZGItNGJhYS1hYjRlLWEwMmRhMzMzMzczNyIsImZvcndhcmRUbyI6ImR2dXMxLWFwaS04NDRmNTY5NDktNWtwbGMifQ';
const QUERY_URL = `${SDL}/queries/${encodeURIComponent(QUERY_ID)}`;
const PQ = 'dataSource.name = "SentinelOne" | limit 10';

const request = jest.fn();
const ctx = {
  client: { request },
  config: { url: CONSOLE },
  secrets: { authType: 'api_key_header', token: TOKEN },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

const action = () => SentinelOne.actions.runQuery;
const run = (input: Record<string, unknown>) => action().handler(ctx, action().input.parse(input));

const RATE_HEADERS = {
  'x-ratelimit-limit': '8',
  'x-ratelimit-refillrate': '5/s',
  'x-ratelimit-remaining': '7',
  'x-ratelimit-type': 'local',
};
const answer = (data: unknown, tag = TAG) => ({
  status: 200,
  data,
  headers: { 'x-dataset-query-forward-tag': tag, ...RATE_HEADERS },
});
const DELETED = { status: 204, data: '', headers: { 'x-dataset-query-forward-tag': TAG } };

/** The QueryResult of tests/final/replacement_probe/sdl_launch_valid_pq.json (complete at launch). */
const TABLE = {
  matchCount: 0,
  values: [],
  columns: [
    { name: 'timestamp', cellType: 'TIMESTAMP', decimalPlaces: null },
    { name: 'message', cellType: 'STRING', decimalPlaces: null },
  ],
  keyColumns: 0,
  omittedEvents: 0,
  partialResultsDueToTimeLimit: false,
  discardedArrayItems: 0,
  warnings: [],
  fullResultUrl: null,
};
const RESOLVED = { start: 1794968428269000000, end: 1794971998269000000 };
const result = (stepsCompleted: number, data: unknown = null) => ({
  id: QUERY_ID,
  stepsCompleted,
  stepsTotal: 2,
  totalSteps: 2,
  resolvedTimeRange: RESOLVED,
  cpuUsage: 4107783,
  data,
});

const httpError = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

const calls = () => request.mock.calls.map(([config]) => config);

let sleep: jest.SpyInstance;
beforeEach(() => {
  request.mockReset();
  sleep = jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('runQuery', () => {
  it('is a read-only tool whose description states the service, the language, the limits and the replacement', () => {
    expect(action().isTool).toBe(true);
    expect(action().scope).toBe('read');
    for (const text of [
      'read-only',
      'Singularity Data Lake',
      'long-running query service',
      'Power Query (PQ)',
      "a bare '*' is invalid",
      'S1QL 1.0 queries are not supported',
      'burst of 8 requests refilled at 5 per second',
      'Retry-After up to 30 seconds',
      'HTTP 403 means the user lacks it',
      'An alternative to the deprecated createQuery, getQueryStatus and getQueryEvents',
    ]) {
      expect(action().description).toContain(text);
    }
  });

  it('bounds its inputs before any request', () => {
    const { input } = action();
    for (const [candidate, message] of [
      [{}, 'expected string'],
      [{ query: '   ' }, 'Too small'],
      [{ query: 'x'.repeat(4097) }, 'Too big'],
      [{ query: PQ, waitSeconds: 9 }, 'Too small'],
      [{ query: PQ, waitSeconds: 101 }, 'Too big'],
      [{ query: PQ, queryPriority: 'URGENT' }, 'Invalid option'],
      [{ query: PQ, startTime: 'banana' }, 'Invalid string'],
      [{ query: PQ, accountIds: ['1'], tenant: true }, 'tenant must not be true'],
    ] as Array<[Record<string, unknown>, string]>) {
      expect(() => input.parse(candidate)).toThrow(message);
    }
    expect(request).not.toHaveBeenCalled();
    for (const ok of [
      { query: 'x'.repeat(4096), waitSeconds: 10 },
      { query: PQ, waitSeconds: 100, startTime: '1h', endTime: '1794971998269' },
      { query: PQ, startTime: '7d', tenant: true },
    ]) {
      expect(() => input.parse(ok)).not.toThrow();
    }
  });

  it('returns a result that is complete at launch and deletes the query with the forward tag', async () => {
    request.mockResolvedValueOnce(answer(result(2, TABLE))).mockResolvedValueOnce(DELETED);

    await expect(
      run({ query: PQ, startTime: '1h', accountIds: ['225494730938493804'] })
    ).resolves.toEqual({
      status: 'completed',
      stepsCompleted: 2,
      stepsTotal: 2,
      resolvedTimeRange: RESOLVED,
      cpuUsage: 4107783,
      data: {
        columns: TABLE.columns,
        values: [],
        rowCount: 0,
        truncated: false,
        matchCount: 0,
        warnings: [],
        partialResultsDueToTimeLimit: false,
        omittedEvents: 0,
      },
      queryDeleted: true,
    });

    const [launch, remove] = calls();
    expect(launch).toEqual({
      method: 'POST',
      url: `${SDL}/queries`,
      data: {
        queryType: 'PQ',
        pq: { query: PQ, resultType: 'TABLE' },
        startTime: '1h',
        queryPriority: 'LOW',
        accountIds: ['225494730938493804'],
        tenant: false,
      },
      headers: { Authorization: BEARER, token: false },
      timeout: 60_000,
    });
    expect(remove).toEqual(
      expect.objectContaining({
        method: 'DELETE',
        url: QUERY_URL,
        headers: { 'X-Dataset-Query-Forward-Tag': TAG, Authorization: BEARER, token: false },
      })
    );
    expect(calls()).toHaveLength(2);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('polls every 2 s with the last step seen and the latest forward tag, caps the rows, then deletes', async () => {
    const rows = Array.from({ length: 1500 }, (_, index) => [index, `event ${index}`]);
    request
      .mockResolvedValueOnce(answer(result(0)))
      .mockResolvedValueOnce(answer(result(1), TAG_2))
      .mockResolvedValueOnce(
        answer(
          result(2, {
            ...TABLE,
            values: rows,
            matchCount: 1500,
            warnings: ['Result set limited'],
            partialResultsDueToTimeLimit: true,
          }),
          TAG_2
        )
      )
      .mockResolvedValueOnce(DELETED);

    const output = await run({ query: PQ, queryPriority: 'HIGH', tenant: true, waitSeconds: 30 });

    expect(output).toEqual(
      expect.objectContaining({
        status: 'completed',
        stepsCompleted: 2,
        queryDeleted: true,
        data: expect.objectContaining({
          rowCount: 1500,
          truncated: true,
          matchCount: 1500,
          warnings: ['Result set limited'],
          partialResultsDueToTimeLimit: true,
        }),
      })
    );
    const { data } = output as { data: { values: unknown[] } };
    expect(data.values).toHaveLength(1000);
    expect(data.values[999]).toEqual([999, 'event 999']);

    const [launch, poll1, poll2, remove] = calls();
    expect(launch.data).toEqual({
      queryType: 'PQ',
      pq: { query: PQ, resultType: 'TABLE' },
      queryPriority: 'HIGH',
      tenant: true,
    });
    expect(poll1).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: QUERY_URL,
        params: { lastStepSeen: 0 },
        headers: { 'X-Dataset-Query-Forward-Tag': TAG, Authorization: BEARER, token: false },
      })
    );
    expect(poll2).toEqual(
      expect.objectContaining({
        params: { lastStepSeen: 1 },
        headers: expect.objectContaining({ 'X-Dataset-Query-Forward-Tag': TAG_2 }),
      })
    );
    expect(remove).toEqual(
      expect.objectContaining({
        method: 'DELETE',
        url: QUERY_URL,
        headers: expect.objectContaining({ 'X-Dataset-Query-Forward-Tag': TAG_2 }),
      })
    );
    expect(sleep.mock.calls).toEqual([[2_000], [2_000]]);
  });

  it('returns timedOut after waitSeconds, deletes the query and says what to do', async () => {
    request.mockImplementation(async ({ method }: { method: string }) =>
      method === 'DELETE' ? DELETED : answer(result(1))
    );

    const output = await run({ query: PQ, waitSeconds: 10 });

    expect(output).toEqual({
      status: 'timedOut',
      stepsCompleted: 1,
      stepsTotal: 2,
      resolvedTimeRange: RESOLVED,
      cpuUsage: 4107783,
      data: null,
      queryDeleted: true,
      message:
        'The query did not finish within 10 seconds. The query was deleted. Narrow the time range (startTime, endTime) or the filter, then run it again.',
    });
    const methods = calls().map(({ method }) => method);
    // launch, 5 polls of 2 s within 10 s, delete
    expect(methods).toEqual(['POST', 'GET', 'GET', 'GET', 'GET', 'GET', 'DELETE']);
  });

  it('fails on a rejected launch without a delete, and on a failed query after deleting it', async () => {
    request.mockRejectedValueOnce(
      httpError(
        400,
        {
          code: 'invalid_argument',
          message: "Don't understand [*] -- try enclosing it in quotes",
          details: [],
        },
        { 'x-dataset-query-forward-tag': TAG }
      )
    );
    await expect(run({ query: '*' })).rejects.toThrow(
      "Status code: 400. Message: API Error [Bad Request] invalid_argument Don't understand [*] -- try enclosing it in quotes"
    );
    expect(calls()).toHaveLength(1);

    request.mockReset();
    request
      .mockResolvedValueOnce(answer(result(0)))
      .mockResolvedValueOnce(
        answer({ ...result(1), error: { message: 'Query exceeded memory', details: { limit: 1 } } })
      )
      .mockResolvedValueOnce(DELETED);
    await expect(run({ query: PQ })).rejects.toThrow(
      'SentinelOne runQuery: the query failed: Query exceeded memory {"limit":1}'
    );
    expect(calls().map(({ method }) => method)).toEqual(['POST', 'GET', 'DELETE']);
  });

  it('deletes the query when a poll fails and never puts the token in the error', async () => {
    request
      .mockResolvedValueOnce(answer(result(0)))
      .mockRejectedValueOnce(
        httpError(401, {
          message: "Couldn't decode API token ...token.",
          status: 'error/client/badParam',
        })
      )
      .mockResolvedValueOnce(DELETED);
    const error = await run({ query: PQ }).catch((err: Error) => err);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Status code: 401');
    expect((error as Error).message).not.toContain(TOKEN);
    expect((error as Error).message).not.toContain('...token');
    expect(calls().map(({ method }) => method)).toEqual(['POST', 'GET', 'DELETE']);
  });

  it('leaves the deprecated Deep Visibility and hash reputation requests unchanged', async () => {
    const API = `${CONSOLE}/web/api/v2.1`;
    const AUTH = { Authorization: `ApiToken ${TOKEN}`, token: false };
    request.mockResolvedValue({ status: 200, data: { data: {} } });
    const legacy = async (name: string, input: Record<string, unknown>) => {
      const old = SentinelOne.actions[name];
      expect(old.description).toContain('Deprecated in the official SentinelOne API specification');
      await old.handler(ctx, old.input.parse(input));
      return request.mock.calls[request.mock.calls.length - 1][0];
    };

    expect(
      await legacy('createQuery', {
        query: 'EventType = "Process Creation"',
        fromDate: '2026-01-01T00:00:00Z',
        toDate: '2026-01-02T00:00:00Z',
        queryType: 'events',
        siteIds: ['21'],
      })
    ).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/dv/init-query`,
        headers: AUTH,
        data: {
          query: 'EventType = "Process Creation"',
          fromDate: '2026-01-01T00:00:00Z',
          toDate: '2026-01-02T00:00:00Z',
          siteIds: ['21'],
          queryType: ['events'],
        },
      })
    );
    expect(await legacy('getQueryStatus', { queryId: 'q1' })).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/dv/query-status`,
        params: { queryId: 'q1' },
        headers: AUTH,
      })
    );
    expect(await legacy('getQueryEvents', { queryId: 'q1', limit: 100 })).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/dv/events`,
        params: { queryId: 'q1', limit: 100 },
        headers: AUTH,
      })
    );
    expect(await legacy('getHashReputation', { hash: 'b'.repeat(40) })).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/hashes/${'b'.repeat(40)}/verdict`,
        headers: AUTH,
      })
    );
  });

  it('reports a failed delete as cleanupFailed without failing the action', async () => {
    request
      .mockResolvedValueOnce(answer(result(2, TABLE)))
      .mockRejectedValueOnce(httpError(500, { code: 'internal', message: 'boom', details: [] }));

    await expect(run({ query: PQ })).resolves.toEqual(
      expect.objectContaining({ status: 'completed', queryDeleted: false, cleanupFailed: true })
    );
    expect(ctx.log.debug).toHaveBeenCalledWith(
      expect.stringContaining('SentinelOne runQuery: deleting the query failed: Status code: 500')
    );
  });
});
