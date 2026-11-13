/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import type { Recording, ResponseFixture } from './response_engine';

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
        parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'ok', content: { 'application/json': { schema: user } } },
        },
      },
    },
  },
};

const getUser = { method: 'GET', path: '/users/{id}' };

const recording = (...bodies: unknown[]): Recording => ({
  recordedAt: '2026-10-06',
  exchanges: bodies.map((body) => ({ operation: getUser, response: { status: 200, body } })),
});

const getBody = async (options: {
  fixtures?: ResponseFixture[];
  recordings?: Recording[];
}): Promise<unknown> => {
  const { fetch } = createEmulatorFetch({ specs: [spec], ...options });
  return (await fetch('https://api.example.com/users/7')).json();
};

describe('createResponseEngine', () => {
  it('serves recordings matched by operation, not by URL', async () => {
    expect(await getBody({ recordings: [recording({ id: 1, name: 'Ada' })] })).toEqual({
      id: 1,
      name: 'Ada',
    });
  });

  it('prefers fixtures over recordings, and recordings over samples', async () => {
    const fixtures = [{ operation: getUser, response: { status: 200, body: { id: 2 } } }];

    expect(await getBody({ fixtures, recordings: [recording({ id: 1 })] })).toEqual({ id: 2 });
    expect(await getBody({})).toEqual({ id: 0, name: 'string' });
  });

  it('rejects recordings that no longer conform to the spec, serving the next one', async () => {
    const { fetch, rejectedResponses } = createEmulatorFetch({
      specs: [spec],
      recordings: [recording({ name: 'no id' }, { id: 1 })],
    });

    expect(await (await fetch('https://api.example.com/users/7')).json()).toEqual({ id: 1 });
    expect(rejectedResponses).toEqual([
      {
        source: 'recording',
        operation: 'GET /users/{id}',
        violations: [expect.objectContaining({ code: 'required' })],
      },
    ]);
  });

  it('rejects fixtures and recordings for operations the spec lacks', () => {
    const removed = { method: 'delete', path: '/users/{id}' };
    const { rejectedResponses } = createEmulatorFetch({
      specs: [spec],
      fixtures: [{ operation: removed, response: { status: 204 } }],
      recordings: [{ exchanges: [{ operation: removed, response: { status: 204 } }] }],
    });

    expect(rejectedResponses.map(({ source, operation }) => `${source} ${operation}`)).toEqual([
      'fixture DELETE /users/{id}',
      'recording DELETE /users/{id}',
    ]);
  });

  it('keeps recorded error responses out of the default answers', async () => {
    const recordings: Recording[] = [
      {
        exchanges: [
          { operation: getUser, response: { status: 404, body: { error: 'missing' } } },
          { operation: getUser, response: { status: 200, body: { id: 5 } } },
        ],
      },
    ];

    expect(await getBody({ recordings })).toEqual({ id: 5 });
  });

  describe('matching requests', () => {
    const users = {
      ...spec,
      paths: {
        '/users': {
          post: {
            operationId: 'createUser',
            requestBody: { content: { 'application/json': { schema: user } } },
            responses: {
              '201': { description: 'created', content: { 'application/json': { schema: user } } },
              '409': { description: 'exists' },
            },
          },
        },
        '/users/{id}': {
          get: {
            ...spec.paths['/users/{id}'].get,
            parameters: [
              ...spec.paths['/users/{id}'].get.parameters,
              { name: 'fields', in: 'query', schema: { type: 'string' } },
            ],
          },
        },
      },
    };
    const fixture = (
      when: ResponseFixture['when'],
      body: unknown,
      status = 200
    ): ResponseFixture => ({
      operation: getUser,
      ...(when === undefined ? {} : { when }),
      response: { status, body },
    });
    const get = async (options: Parameters<typeof createEmulatorFetch>[0], url: string) => {
      const response = await createEmulatorFetch(options).fetch(`https://api.example.com${url}`);
      return { status: response.status, body: await response.json() };
    };

    it('answers each request with the fixture whose when it matches', async () => {
      const fixtures = [
        fixture({ path: { id: '1' } }, { id: 1, name: 'Ada' }),
        fixture({ path: { id: '2' } }, { id: 2, name: 'Grace' }),
        fixture(undefined, { id: 0, name: 'Anyone' }),
      ];

      expect((await get({ specs: [users], fixtures }, '/users/2')).body).toEqual({
        id: 2,
        name: 'Grace',
      });
      expect((await get({ specs: [users], fixtures }, '/users/9')).body).toEqual({
        id: 0,
        name: 'Anyone',
      });
      expect(
        (await get({ specs: [users], fixtures: fixtures.slice(0, 2) }, '/users/9')).body
      ).toEqual({ id: 0, name: 'string' });
    });

    it('prefers the fixture that checks the most values', async () => {
      const fixtures = [
        fixture({ path: { id: '7' } }, { id: 7, name: 'by id' }),
        fixture(
          { path: { id: '7' }, query: { fields: 'name' } },
          { id: 7, name: 'by id and query' }
        ),
      ];

      expect((await get({ specs: [users], fixtures }, '/users/7?fields=name')).body.name).toBe(
        'by id and query'
      );
      expect((await get({ specs: [users], fixtures }, '/users/7')).body.name).toBe('by id');
    });

    it('serves error fixtures for some requests, such as a 404 for an unknown id', async () => {
      const fixtures = [fixture({ path: { id: '404' } }, { message: 'Not found' }, 404)];

      expect(await get({ specs: [users], fixtures }, '/users/404')).toEqual({
        status: 404,
        body: { message: 'Not found' },
      });
      expect((await get({ specs: [users], fixtures }, '/users/1')).status).toBe(200);
    });

    it('matches the fields of the body a fixture names, ignoring the others', async () => {
      const { fetch } = createEmulatorFetch({
        specs: [users],
        fixtures: [
          {
            operation: { method: 'POST', path: '/users' },
            when: { body: { name: 'Ada' } },
            response: { status: 409 },
          },
        ],
      });
      const create = (body: unknown) =>
        fetch('https://api.example.com/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

      expect((await create({ id: 1, name: 'Ada' })).status).toBe(409);
      expect((await create({ id: 2, name: 'Grace' })).status).toBe(201);
    });

    it('replays the recording of the same request, else the first recording', async () => {
      const recordings: Recording[] = [
        {
          exchanges: [1, 2].map((id) => ({
            operation: getUser,
            request: { pathParameters: { id: String(id) } },
            response: { status: 200, body: { id, name: `user ${id}` } },
          })),
        },
      ];

      expect((await get({ specs: [users], recordings }, '/users/2')).body).toEqual({
        id: 2,
        name: 'user 2',
      });
      expect((await get({ specs: [users], recordings }, '/users/9')).body).toEqual({
        id: 1,
        name: 'user 1',
      });
    });

    it('rejects fixtures whose when names a path parameter the operation lacks', () => {
      const { rejectedResponses } = createEmulatorFetch({
        specs: [users],
        fixtures: [fixture({ path: { userId: '1' } }, { id: 1 })],
      });

      expect(rejectedResponses).toEqual([
        {
          source: 'fixture',
          operation: 'GET /users/{id}',
          violations: [expect.objectContaining({ path: ['when', 'path', 'userId'], code: 'when' })],
        },
      ]);
    });

    it('gives responders the path parameters of the request', async () => {
      const { body } = await get(
        {
          specs: [users],
          respond: (_operation, { pathParameters = {} }) => ({
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: { id: Number(pathParameters.id) },
          }),
        },
        '/users/42'
      );

      expect(body).toEqual({ id: 42 });
    });
  });
});
