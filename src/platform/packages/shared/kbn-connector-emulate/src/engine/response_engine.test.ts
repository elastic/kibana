/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
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
  const { fetch } = createContractMockFetch({ specs: [spec], ...options });
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
    const { fetch, rejectedResponses } = createContractMockFetch({
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
    const { rejectedResponses } = createContractMockFetch({
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
});
