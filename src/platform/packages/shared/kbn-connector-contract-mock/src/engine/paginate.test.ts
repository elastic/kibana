/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import type { PaginatedOperation } from './paginate';

const channel = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', example: 'C1' } },
};

const listResponse = (properties: Record<string, unknown>) => ({
  '200': {
    description: 'ok',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { channels: { type: 'array', items: channel }, ...properties },
        },
      },
    },
  },
});

const query = (...names: string[]) =>
  names.map((name) => ({
    name,
    in: 'query',
    schema: { type: name === 'cursor' ? 'string' : 'integer', maximum: 100 },
  }));

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/conversations.list': {
      get: {
        parameters: query('cursor', 'limit'),
        responses: listResponse({
          response_metadata: {
            type: 'object',
            properties: { next_cursor: { type: 'string' } },
          },
        }),
      },
    },
    '/offset': {
      get: {
        parameters: query('offset', 'limit'),
        responses: listResponse({ total: { type: 'integer' } }),
      },
    },
    '/pages': { get: { parameters: query('page', 'per_page'), responses: listResponse({}) } },
  },
};

const pagination: PaginatedOperation[] = [
  {
    operation: { method: 'GET', path: '/conversations.list' },
    pagination: {
      style: 'cursor',
      request: { cursorParam: 'cursor', sizeParam: 'limit' },
      response: { itemsPath: 'channels', nextPath: 'response_metadata.next_cursor' },
      end: 'empty_string',
    },
  },
  {
    operation: { method: 'GET', path: '/offset' },
    pagination: {
      style: 'offset',
      request: { offsetParam: 'offset', sizeParam: 'limit' },
      response: { itemsPath: 'channels', totalPath: 'total' },
    },
  },
  {
    operation: { method: 'GET', path: '/pages' },
    pagination: {
      style: 'page',
      request: { pageParam: 'page', sizeParam: 'per_page' },
      response: { itemsPath: 'channels' },
    },
  },
];

const createMock = (collectionSize: number) =>
  createContractMockFetch({ specs: [spec], pagination, collectionSize });

const getJson = async (fetch: typeof globalThis.fetch, path: string) => {
  const response = await fetch(`https://api.example.com${path}`);
  return { status: response.status, body: await response.json() };
};

const ids = ({ channels }: { channels: Array<{ id: string }> }) => channels.map(({ id }) => id);

describe('withPagination', () => {
  it('pages through a cursor-paginated collection until the vendor end signal', async () => {
    const { fetch, calls } = createMock(5);

    const first = await getJson(fetch, '/conversations.list?limit=2');
    const second = await getJson(
      fetch,
      `/conversations.list?limit=2&cursor=${first.body.response_metadata.next_cursor}`
    );
    const last = await getJson(
      fetch,
      `/conversations.list?limit=2&cursor=${second.body.response_metadata.next_cursor}`
    );

    expect([ids(first.body), ids(second.body), ids(last.body)]).toEqual([
      ['C1-1', 'C1-2'],
      ['C1-3', 'C1-4'],
      ['C1-5'],
    ]);
    expect(last.body.response_metadata.next_cursor).toBe('');
    expect(calls.flatMap(({ responseViolations }) => responseViolations)).toEqual([]);
  });

  it('answers 400 for cursors the mock did not issue', async () => {
    const { fetch } = createMock(5);

    expect((await getJson(fetch, '/conversations.list?cursor=made-up')).status).toBe(400);
  });

  it('selects offset and page-number slices, reporting the total', async () => {
    const { fetch } = createMock(5);

    const offset = await getJson(fetch, '/offset?offset=3&limit=2');
    const page = await getJson(fetch, '/pages?page=2&per_page=2');

    expect({ ids: ids(offset.body), total: offset.body.total }).toEqual({
      ids: ['C1-4', 'C1-5'],
      total: 5,
    });
    expect(ids(page.body)).toEqual(['C1-3', 'C1-4']);
  });

  it.each([
    [0, []],
    [1, ['C1-1']],
  ])('serves collections of %i items', async (size, expected) => {
    const { body } = await getJson(createMock(size).fetch, '/conversations.list');

    expect(ids(body)).toEqual(expected);
    expect(body.response_metadata.next_cursor).toBe('');
  });

  it('rejects page sizes above the vendor maximum before paginating', async () => {
    const { status } = await getJson(createMock(5).fetch, '/conversations.list?limit=500');

    expect(status).toBe(422);
  });
});
