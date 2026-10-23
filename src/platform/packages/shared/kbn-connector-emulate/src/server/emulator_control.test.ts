/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '../openapi';
import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { createEmulatorControlHandler, isControlPath } from './emulator_control';

const spec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Vendor', version: '1' },
  servers: [{ url: 'https://api.vendor.example/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        responses: { '200': { description: 'The items' } },
      },
    },
  },
};

const control = (path: string, method = 'GET') =>
  new Request(new URL(path, 'http://emulator.invalid'), { method });

const putJson = (path: string, body: unknown) =>
  new Request(new URL(path, 'http://emulator.invalid'), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('createEmulatorControlHandler', () => {
  let emulator: ReturnType<typeof createEmulatorFetch>;
  let handle: ReturnType<typeof createEmulatorControlHandler>;

  beforeEach(async () => {
    emulator = createEmulatorFetch({ specs: [spec] });
    handle = createEmulatorControlHandler(emulator);
    await emulator.fetch('https://api.vendor.example/v1/items');
    await emulator.fetch('https://api.vendor.example/v1/unknown');
  });

  it('answers GET /_mock/calls with the calls and their total', async () => {
    const response = await handle(control('/_mock/calls'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      calls: [
        expect.objectContaining({ operation: 'listItems', status: 200, requestViolations: [] }),
        expect.objectContaining({
          request: 'GET https://api.vendor.example/v1/unknown',
          status: 404,
        }),
      ],
      total: 2,
    });
  });

  it('answers only the calls from index since on', async () => {
    const { calls, total } = await (await handle(control('/_mock/calls?since=1'))).json();

    expect(calls).toEqual([expect.objectContaining({ status: 404 })]);
    expect(total).toBe(2);
  });

  it.each(['-1', '1.5', 'x'])('answers 400 to since=%s', async (since) => {
    expect((await handle(control(`/_mock/calls?since=${since}`))).status).toBe(400);
  });

  it('empties the calls on POST /_mock/reset', async () => {
    const response = await handle(control('/_mock/reset', 'POST'));

    expect(response.status).toBe(204);
    expect(emulator.calls).toEqual([]);
  });

  it('lists the operations on GET /_mock/operations', async () => {
    expect(await (await handle(control('/_mock/operations'))).json()).toEqual({
      operations: [
        {
          protocol: 'openapi',
          id: 'listItems',
          method: 'GET',
          path: '/items',
          servers: ['https://api.vendor.example/v1'],
        },
      ],
    });
  });

  it('answers 405 with Allow to the wrong method', async () => {
    const response = await handle(control('/_mock/reset'));

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(emulator.calls).toHaveLength(2);
  });

  it('sets, lists and drops runtime fixtures on PUT, GET and DELETE /_mock/fixtures', async () => {
    const fixture = {
      operation: { method: 'GET', path: '/items' },
      response: { status: 429, headers: { 'retry-after': '1' } },
    };

    const put = await handle(putJson('/_mock/fixtures', { fixtures: [fixture] }));
    expect(put.status).toBe(200);
    expect(await put.json()).toEqual({ fixtures: [fixture] });
    expect((await emulator.fetch('https://api.vendor.example/v1/items')).status).toBe(429);
    expect(await (await handle(control('/_mock/fixtures'))).json()).toEqual({
      fixtures: [fixture],
    });

    expect((await handle(control('/_mock/fixtures?operation=listItems', 'DELETE'))).status).toBe(
      204
    );
    expect(emulator.runtimeFixtures.list()).toEqual([]);
  });

  it('answers 400 with the rejected fixtures, and sets none, when the spec rejects one', async () => {
    const response = await handle(
      putJson('/_mock/fixtures', {
        fixtures: [{ operation: { method: 'GET', path: '/teams' }, response: { status: 200 } }],
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).rejected).toEqual([
      expect.objectContaining({ operation: 'GET /teams' }),
    ]);
    expect(emulator.runtimeFixtures.list()).toEqual([]);
  });

  it.each([
    ['not JSON', 'nope', 'not JSON'],
    ['no fixtures list', { fixture: {} }, '"fixtures"'],
    ['a fixture without an operation', { fixtures: [{ response: { status: 200 } }] }, 'operation'],
    [
      'a fixture without a status',
      { fixtures: [{ operation: { name: 'query boards' }, response: {} }] },
      'response',
    ],
  ])('answers 400 to a body with %s', async (_case, body, detail) => {
    const response = await handle(
      new Request(new URL('/_mock/fixtures', 'http://emulator.invalid'), {
        method: 'PUT',
        body: typeof body === 'string' ? body : JSON.stringify(body),
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).detail).toContain(detail);
  });

  it('describes an operation on GET /_mock/operations/<id>', async () => {
    const response = await handle(control('/_mock/operations/listItems'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: 'listItems', method: 'GET', path: '/items' });
    expect((await handle(control('/_mock/operations/deleteItem'))).status).toBe(404);
  });

  it('answers 404 naming the endpoints to unknown paths', async () => {
    const response = await handle(control('/_mock/unknown'));

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toContain('/_mock/calls');
  });
});

describe('isControlPath', () => {
  it.each([
    ['/_mock', true],
    ['/_mock/calls', true],
    ['/_mock?x=1', true],
    ['/_mocker', false],
    ['/items', false],
    ['http://vendor.example/_mock/calls', false],
  ])('%s: %s', (path, expected) => {
    expect(isControlPath(path)).toBe(expected);
  });
});
