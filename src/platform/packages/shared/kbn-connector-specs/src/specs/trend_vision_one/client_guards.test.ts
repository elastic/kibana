/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFinitePositiveNumber, getHeaderValue } from '../../connector_utils';
import {
  apiUrlProblem,
  checkNextLink,
  decodeSegment,
  filterHeader,
  getApiOrigin,
  normaliseLink,
  lastPathSegment,
  vendorRequest,
} from './client';
import { taskIdFrom } from './multi_status';
import { GetTaskInputSchema } from './response_types';
import {
  API,
  ctx,
  ctxWith,
  httpError,
  ok,
  request,
  resetMocksAroundEachTest,
  run,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

describe('TrendAI Vision One failed writes', () => {
  const mutate = (action = 'addAlertNote') =>
    vendorRequest(ctx, { action, method: 'POST', path: '/x', mutating: true });

  it.each([
    [
      'a timeout',
      () => Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' }),
      'TrendAI Vision One addAlertNote request failed: timed out after 60 s. The change may already have been applied; check before repeating it.',
    ],
    [
      'a connection reset',
      () => Object.assign(new Error('socket hang up'), { isAxiosError: true, code: 'ECONNRESET' }),
      'TrendAI Vision One addAlertNote request failed: socket hang up. The change may already have been applied; check before repeating it.',
    ],
    [
      'a 503',
      () => httpError(503, vendorError('ServiceUnavailable', 'down')),
      'TrendAI Vision One addAlertNote failed (503): ServiceUnavailable: down. The change may already have been applied; check before repeating it.',
    ],
  ])(
    'says the change may already have been applied after %s on a write',
    async (_what, make, message) => {
      request.mockRejectedValue(make());
      await expect(mutate()).rejects.toThrow(new Error(message));
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ['a 400', httpError(400, vendorError('BadRequest', 'no'))],
    ['a 404', httpError(404)],
    ['a 412', httpError(412)],
    ['a 429', httpError(429)],
  ])('adds no "may already have been applied" hint after %s on a write', async (_what, failure) => {
    request.mockRejectedValue(failure);
    const error = await mutate().catch((caught: Error) => caught);
    expect((error as Error).message).not.toContain('may already have been applied');
  });

  it('adds no hint to a failed read or to a non-HTTP error', async () => {
    request.mockRejectedValue(
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    const read = await vendorRequest(ctx, {
      action: 'x',
      method: 'GET',
      path: '/x',
      mutating: false,
    }).catch((caught: Error) => caught);
    expect((read as Error).message).toBe(
      'TrendAI Vision One x request failed: timed out after 60 s'
    );
    request.mockRejectedValue(new Error('Host is not allowed'));
    await expect(mutate()).rejects.toThrow(new Error('Host is not allowed'));
  });
});

describe('TrendAI Vision One credentials in a URL', () => {
  it.each([
    'https://user:secret@api.in.xdr.trendmicro.com',
    'https://user@api.in.xdr.trendmicro.com',
    'https://:secret@api.in.xdr.trendmicro.com',
  ])('refuses apiUrl %s with a user name or password', (apiUrl) => {
    expect(apiUrlProblem(apiUrl)).toBe(
      'TrendAI Vision One API URL must not contain a user name or password. Give only the API address, for example https://api.in.xdr.trendmicro.com.'
    );
    expect(() => getApiOrigin(ctxWith(apiUrl))).toThrow('must not contain a user name or password');
  });

  it.each([
    `https://u:p@api.in.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=1`,
    `https://u@api.in.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=1`,
  ])('refuses the nextLink %s with a user name or password', (link) => {
    expect(() => checkNextLink(ctx, link, '/workbench/alerts')).toThrow(
      'nextLink must not contain a user name or password'
    );
  });
});

describe('TrendAI Vision One nextLink page size', () => {
  const path = '/endpointSecurity/endpoints';
  const link = (query: string) => `${API}${path}${query}`;

  it.each(['?top=201', '?top=1000', '?skipToken=1&top=500', '?top=abc', '?top=10&top=1000'])(
    'refuses %s above the cap of 200',
    (query) => {
      expect(() => checkNextLink(ctx, link(query), path, 200)).toThrow(
        'nextLink asks for a page size'
      );
    }
  );

  it.each(['', '?skipToken=1', '?top=200', '?top=10&skipToken=2'])(
    'accepts %j (no top, or top within the cap)',
    (query) => {
      expect(checkNextLink(ctx, link(query), path, 200)).toBe(link(query));
    }
  );

  it('does not limit top when the action gives no cap', () => {
    expect(checkNextLink(ctx, link('?top=1000'), path)).toBe(link('?top=1000'));
  });
});

describe('TrendAI Vision One filter header characters', () => {
  it.each(["endpointName eq 'PC1東京'", '\u0100', 'a\ud83d\ude00'])(
    'refuses %j: the HTTP client would silently remove those characters',
    (filter) => {
      expect(() => filterHeader(filter)).toThrow('characters above U+00FF');
    }
  );

  it('sends characters up to U+00FF and ASCII unchanged', () => {
    expect(filterHeader("endpointName eq 'café'")).toEqual({
      'TMV1-Filter': "endpointName eq 'café'",
    });
    expect(filterHeader(undefined)).toBeUndefined();
  });
});

describe('TrendAI Vision One id decoding and link normalising', () => {
  it.each([
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/note_7#details', 'note_7'],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/note_7?x=1', 'note_7'],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/a%23b', 'a#b'],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/2035567', '2035567'],
    ['/v3.0/workbench/alerts/WB-1/notes/2035567/', '2035567'],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/%E0%A4%A', null],
    ['https://api.xdr.trendmicro.com/', null],
    ['https://', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/.', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/..', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/%2e%2E', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/./', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/.?x=1', null],
    ['https://api.xdr.trendmicro.com/v3.0/workbench/alerts/WB-1/notes/a.b', 'a.b'],
  ])('takes the last path segment of %s: %j', (value, expected) => {
    expect(lastPathSegment(value)).toBe(expected);
  });

  it('decodes a segment without any id rule and returns null when it is malformed', () => {
    expect(decodeSegment('note_7')).toBe('note_7');
    expect(decodeSegment('a.b~c')).toBe('a.b~c');
    expect(decodeSegment('a%20b')).toBe('a b');
    expect(decodeSegment('%E0%A4%A')).toBeNull();
    expect(decodeSegment('%')).toBeNull();
  });

  it('puts the same cursor in one form: absolute, sorted query, no fragment', () => {
    expect(normaliseLink(ctx, '/v3.0/x?b=2&a=1#frag')).toBe(`${API}/x?a=1&b=2`);
  });
});

describe('TrendAI Vision One headers on a failed request, as the Kibana executor reads them', () => {
  // Replicates generate_executor_function.ts: getHttpStatus and the Retry-After part of getRetryDate
  // (a retry date is returned for any HTTP error that carries Retry-After, read or write).
  interface AxiosLikeError {
    response?: { status?: unknown; headers?: unknown };
  }
  const retryDate = (error: unknown): Date | undefined => {
    const { response } = (error ?? {}) as AxiosLikeError;
    if (typeof response?.status !== 'number') return undefined;
    const value = getHeaderValue({ headers: response.headers, headerName: 'retry-after' });
    const retryAfter = Array.isArray(value) ? value[0] : value;
    if (typeof retryAfter === 'string' && retryAfter.trim() !== '') {
      const seconds = getFinitePositiveNumber(retryAfter.trim());
      if (seconds !== undefined) return new Date(Date.now() + seconds * 1000);
    }
    return undefined;
  };
  const failure = (mutating: boolean, failed: unknown) => {
    request.mockRejectedValue(failed);
    return vendorRequest(ctx, {
      action: 'x',
      method: mutating ? 'POST' : 'GET',
      path: '/x',
      mutating,
    }).catch((caught: unknown) => caught);
  };

  it.each([
    ['read 429 with Retry-After', false, 429, true],
    ['read 503 with Retry-After', false, 503, true],
    ['write 429 with Retry-After', true, 429, true],
    ['write 503 with Retry-After', true, 503, true],
  ])('%s: the vendor delay is handed over (retry date %s)', async (_what, mutating, status) => {
    const error = await failure(mutating, httpError(status, {}, { 'Retry-After': '120' }));
    const waitMs = (retryDate(error)?.getTime() ?? 0) - Date.now();
    expect(waitMs).toBeGreaterThan(110_000);
    expect(waitMs).toBeLessThanOrEqual(120_000);
    expect((error as { response: unknown }).response).toEqual({
      status,
      headers: { 'Retry-After': '120' },
    });
    expect((error as { status: number }).status).toBe(status);
  });

  it('never puts the request config or the API key on the error of a failed write', async () => {
    const error = await failure(
      true,
      Object.assign(httpError(503, {}, { 'retry-after': '5' }), {
        config: { headers: { Authorization: 'Bearer unit-test-key' } },
        request: { headers: { Authorization: 'Bearer unit-test-key' } },
      })
    );
    expect(Object.keys(error as object).sort()).toEqual([
      'headers',
      'response',
      'status',
      'statusCode',
    ]);
    expect(JSON.stringify(error)).not.toContain('unit-test-key');
    expect((error as Error).message).not.toContain('unit-test-key');
    expect(error).not.toHaveProperty('config');
    expect(error).not.toHaveProperty('request');
  });

  it('gives no retry date for a write 500 without headers or a write without a response', async () => {
    expect(retryDate(await failure(true, httpError(500)))).toBeUndefined();
    const timeout = await failure(
      true,
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    expect(retryDate(timeout)).toBeUndefined();
  });

  it('keeps the messages of a write 503 unchanged', async () => {
    const error = await failure(
      true,
      httpError(503, vendorError('Busy', 'later'), { 'retry-after': '5' })
    );
    expect((error as Error).message).toBe(
      'TrendAI Vision One x failed (503): Busy: later. The change may already have been applied; check before repeating it.'
    );
  });
});

describe('TrendAI Vision One ids read from Location headers', () => {
  const opLocation = (value: string) => ({ headers: [{ name: 'Operation-Location', value }] });

  it.each([
    ['https://api.xdr.trendmicro.com/v3.0/response/tasks/%E0%A4%A', null],
    ['/v3.0/response/tasks/%', null],
    ['/v3.0/response/tasks/a%2Fb', null],
    ['/v3.0/response/tasks/a%20b', null],
    ['/v3.0/response/tasks/' + 'a'.repeat(37), null],
    ['/v3.0/response/tasks/00000012', '00000012'],
    ['/v3.0/response/tasks/RM%2D1', 'RM-1'],
  ])('taskIdFrom %s gives %j', (value, id) => {
    expect(taskIdFrom(opLocation(value))).toBe(id);
  });

  it('only gives ids that getResponseTaskStatus accepts', () => {
    const samples = [
      'https://api.xdr.trendmicro.com/v3.0/response/tasks/00000012',
      '/v3.0/response/tasks/00000012?x=1',
      '/v3.0/response/tasks/RM%2D1',
      '/v3.0/response/tasks/%E0%A4%A',
      '/v3.0/response/tasks/a%2Fb',
      '/v3.0/response/tasks/a%20b',
      '/v3.0/response/tasks/%20',
      '/v3.0/response/tasks/',
      '',
      '/',
      'tasks',
      'https://api.xdr.trendmicro.com',
      '/v3.0/response/tasks/\u3000',
      '/v3.0/response/tasks/%E6%9D%B1',
    ];
    for (const value of samples) {
      const id = taskIdFrom(opLocation(value));
      if (id !== null) {
        expect(GetTaskInputSchema.safeParse({ id }).success).toBe(true);
      }
    }
  });

  it.each([
    ['7', '7'],
    ['note_7', 'note_7'],
    ['2035567', '2035567'],
    ['n%2D7', 'n-7'],
    ['a.b~c', 'a.b~c'],
    ['a%20b', 'a b'],
    ['%E0%A4%A', null],
  ])(
    'addAlertNote reads the note id %s as %j and the write stays a success',
    async (segment, noteId) => {
      request.mockResolvedValueOnce(
        ok(undefined, { location: `${API}/workbench/alerts/WB-1/notes/${segment}` }, 201)
      );
      await expect(run('addAlertNote', { alertId: 'WB-1', content: 'c' })).resolves.toEqual({
        alertId: 'WB-1',
        noteId,
      });
    }
  );
});

describe('TrendAI Vision One task id from the Operation-Location pathname', () => {
  const taskId = (value: string) =>
    taskIdFrom({ headers: [{ name: 'Operation-Location', value }] });
  const base = 'https://api.xdr.trendmicro.com/v3.0/response/tasks';

  it.each([
    [`${base}/00000001`, '00000001'],
    [`${base}/00000001#details`, '00000001'],
    [`${base}/00000001?x=1`, '00000001'],
    [`${base}/RM%2D1`, 'RM-1'],
  ])('reads the task id of %s', (value, id) => {
    expect(taskId(value)).toBe(id);
  });

  it.each([
    [`${base}/%E0%A4%A`],
    [`${base}/a%23b`],
    [`${base}/a%20b`],
    [`${base}/${'a'.repeat(37)}`],
    [`${base}/.`],
    [`${base}/..`],
    [`${base}/%2e`],
  ])('gives null when the id is malformed or rejected by the id check: %s', (value) => {
    expect(taskId(value)).toBeNull();
  });
});

describe('TrendAI Vision One sends one request and throws the failure once', () => {
  const send = (mutating: boolean) =>
    vendorRequest(ctx, {
      action: 'x',
      method: mutating ? 'POST' : 'GET',
      path: '/x',
      mutating,
    }).catch((caught: unknown) => caught);

  it.each([
    ['read', 429, false],
    ['read', 500, false],
    ['read', 503, false],
    ['write', 429, true],
    ['write', 500, true],
    ['write', 503, true],
  ])(
    'a %s answered with %s sends exactly one request and keeps the status and headers',
    async (_kind, status, mutating) => {
      request.mockRejectedValue(
        httpError(status, {}, { 'retry-after': '2', 'x-request-id': 'r1' })
      );
      const error = await send(mutating);
      expect(request).toHaveBeenCalledTimes(1);
      expect(error).toMatchObject({
        status,
        statusCode: status,
        headers: { 'retry-after': '2', 'x-request-id': 'r1' },
        response: { status, headers: { 'retry-after': '2', 'x-request-id': 'r1' } },
      });
    }
  );

  it.each([
    ['read', false],
    ['write', true],
  ])('a %s that times out sends one request', async (_kind, mutating) => {
    request.mockRejectedValue(
      Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' })
    );
    const error = await send(mutating);
    expect(request).toHaveBeenCalledTimes(1);
    expect((error as Error).message).toContain('request failed: timed out after 60 s');
  });

  it.each([
    ['read', false],
    ['write', true],
  ])('a %s is sent with the 60 s timeout and no redirect', async (_kind, mutating) => {
    request.mockResolvedValue(ok({}));
    await send(mutating);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({ timeout: 60000, maxRedirects: 0 });
  });
});
