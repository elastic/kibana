/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import type { ResponseFixture } from './response_engine';

const user = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
};

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'ok', content: { 'application/json': { schema: user } } },
          '404': { description: 'missing' },
        },
      },
    },
    '/users': {
      get: {
        operationId: 'listUsers',
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { type: 'array', items: user } } },
          },
        },
      },
    },
  },
};

const getUser = { method: 'GET', path: '/users/{id}' };
const listUsers = { method: 'GET', path: '/users' };
const ok = (body: unknown) => ({ status: 200, body });

const setup = (fixtures: ResponseFixture[] = []) => {
  const emulator = createEmulatorFetch({ specs: [spec], fixtures });
  const get = async (path: string) => {
    const response = await emulator.fetch(`https://api.example.com${path}`);
    return {
      status: response.status,
      body: response.status === 200 ? await response.json() : undefined,
    };
  };
  return { ...emulator, get };
};

describe('runtime fixtures', () => {
  it('take precedence over the fixtures the emulator was created with', async () => {
    const { runtimeFixtures, get, calls } = setup([
      { operation: getUser, response: ok({ id: 1 }) },
    ]);

    expect(runtimeFixtures.set([{ operation: getUser, response: ok({ id: 2 }) }])).toEqual([]);

    expect((await get('/users/7')).body).toEqual({ id: 2 });
    expect(calls[0].responseSource).toBe('runtime-fixture');
  });

  it('answer only the requests their `when` matches, leaving the rest to the default chain', async () => {
    const { runtimeFixtures, get, calls } = setup([
      { operation: getUser, response: ok({ id: 1 }) },
    ]);
    runtimeFixtures.set([
      { operation: getUser, when: { path: { id: '404' } }, response: { status: 404 } },
    ]);

    expect((await get('/users/404')).status).toBe(404);
    expect((await get('/users/7')).body).toEqual({ id: 1 });
    expect(calls.map(({ responseSource }) => responseSource)).toEqual([
      'runtime-fixture',
      'fixture',
    ]);
  });

  it('replace the runtime fixtures of the operations they name, and keep the others', async () => {
    const { runtimeFixtures, get } = setup();
    runtimeFixtures.set([
      { operation: getUser, response: ok({ id: 1 }) },
      { operation: listUsers, response: ok([{ id: 1 }]) },
    ]);
    runtimeFixtures.set([{ operation: getUser, response: ok({ id: 2 }) }]);

    expect((await get('/users/7')).body).toEqual({ id: 2 });
    expect((await get('/users')).body).toEqual([{ id: 1 }]);
    expect(runtimeFixtures.list()).toHaveLength(2);
  });

  it('are rejected, all of them, when the spec does not allow a response', async () => {
    const { runtimeFixtures, get } = setup();

    const rejected = runtimeFixtures.set([
      { operation: listUsers, response: ok([{ id: 1 }]) },
      { operation: getUser, response: ok({ name: 'no id' }) },
    ]);

    expect(rejected).toEqual([
      {
        source: 'fixture',
        operation: 'GET /users/{id}',
        violations: [expect.objectContaining({ code: 'required' })],
      },
    ]);
    expect(runtimeFixtures.list()).toEqual([]);
    expect((await get('/users')).body).toEqual([{ id: 0, name: 'string' }]);
  });

  it('may answer with an error status the spec does not declare, such as a 429', async () => {
    const { runtimeFixtures, get } = setup();

    expect(
      runtimeFixtures.set([
        { operation: listUsers, response: { status: 429, headers: { 'retry-after': '1' } } },
      ])
    ).toEqual([]);
    expect((await get('/users')).status).toBe(429);
    expect(
      runtimeFixtures.set([{ operation: listUsers, response: { status: 201, body: [] } }])
    ).toEqual([
      expect.objectContaining({ violations: [expect.objectContaining({ code: 'status' })] }),
    ]);
  });

  it('reject operations the spec lacks, path parameters it lacks, and named operations', () => {
    const { runtimeFixtures } = setup();

    const rejected = runtimeFixtures.set([
      { operation: { method: 'GET', path: '/teams' }, response: ok([]) },
      { operation: getUser, when: { path: { user: '1' } }, response: ok({ id: 1 }) },
      { operation: { name: 'query boards' }, response: ok({}) },
    ]);

    expect(rejected.map(({ operation, violations }) => [operation, violations[0].code])).toEqual([
      ['GET /teams', 'operation'],
      ['GET /users/{id}', 'when'],
      ['query boards', 'operation'],
    ]);
  });

  it('are dropped per operation by clear, and all of them by reset', async () => {
    const { runtimeFixtures, reset, get } = setup();
    runtimeFixtures.set([
      { operation: getUser, response: ok({ id: 2 }) },
      { operation: listUsers, response: ok([]) },
    ]);

    runtimeFixtures.clear('getUser');
    expect((await get('/users/7')).body).toEqual({ id: 0, name: 'string' });
    expect(runtimeFixtures.list()).toEqual([{ operation: listUsers, response: ok([]) }]);

    reset();
    expect(runtimeFixtures.list()).toEqual([]);
  });
});
