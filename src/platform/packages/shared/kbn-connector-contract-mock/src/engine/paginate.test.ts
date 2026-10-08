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
import type { RecordedExchange, Recording } from './response_engine';

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
    schema: /cursor|token/.test(name) ? { type: 'string' } : { type: 'integer', maximum: 100 },
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
    '/search': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  start_cursor: { type: 'string' },
                  page_size: { type: 'integer', maximum: 100 },
                },
              },
            },
          },
        },
        responses: listResponse({
          next_cursor: { type: 'string', nullable: true },
          has_more: { type: 'boolean' },
        }),
      },
    },
    '/events': {
      get: {
        parameters: [{ name: 'X-Cursor', in: 'header', schema: { type: 'string' } }],
        responses: listResponse({}),
      },
    },
    '/issues': { get: { parameters: query('page', 'per_page'), responses: listResponse({}) } },
    '/users': {
      get: {
        parameters: query('$top', '$skiptoken'),
        responses: listResponse({ '@odata.nextLink': { type: 'string' } }),
      },
    },
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
  {
    operation: { method: 'POST', path: '/search' },
    pagination: {
      style: 'cursor',
      request: { in: 'body', cursorParam: 'start_cursor', sizeParam: 'page_size' },
      response: { itemsPath: 'channels', nextPath: 'next_cursor', hasMorePath: 'has_more' },
      end: 'null',
      defaultSize: 2,
    },
  },
  {
    operation: { method: 'GET', path: '/events' },
    pagination: {
      style: 'cursor',
      request: { in: 'header', cursorParam: 'X-Cursor' },
      response: { in: 'header', itemsPath: 'channels', nextPath: 'X-Next-Cursor' },
      defaultSize: 2,
    },
  },
  {
    operation: { method: 'GET', path: '/issues' },
    pagination: {
      style: 'link',
      request: { pageParam: 'page', sizeParam: 'per_page' },
      response: { itemsPath: 'channels' },
    },
  },
  {
    operation: { method: 'GET', path: '/users' },
    pagination: {
      style: 'next_url',
      request: { cursorParam: '$skiptoken', sizeParam: '$top' },
      response: { itemsPath: 'channels', nextPath: '["@odata.nextLink"]' },
    },
  },
];

const createMock = (collectionSize: number) =>
  createContractMockFetch({ specs: [spec], pagination, collectionSize });

const toChannels = (...names: string[]) => names.map((id) => ({ id }));

const slackPage = (
  cursor: string | undefined,
  names: string[],
  next: string
): RecordedExchange => ({
  operation: { method: 'GET', path: '/conversations.list' },
  request: { query: cursor ? { cursor, limit: '2' } : { limit: '2' } },
  response: {
    status: 200,
    body: { channels: toChannels(...names), response_metadata: { next_cursor: next } },
  },
});

const createRecordedMock = (exchanges: Recording['exchanges'], collectionSize?: number) =>
  createContractMockFetch({
    specs: [spec],
    pagination,
    collectionSize,
    recordings: [{ exchanges }],
  });

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

  it('reads cursors and page sizes from a JSON body', async () => {
    const { fetch, calls } = createMock(3);
    const search = async (body: object) => {
      const response = await fetch('https://api.example.com/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.json();
    };

    const first = await search({});
    const last = await search({ start_cursor: first.next_cursor, page_size: 2 });

    expect([ids(first), first.has_more, ids(last), last.has_more, last.next_cursor]).toEqual([
      ['C1-1', 'C1-2'],
      true,
      ['C1-3'],
      false,
      null,
    ]);
    expect(calls.flatMap(({ responseViolations }) => responseViolations)).toEqual([]);
  });

  it('reads cursors from a request header and returns the next one in a response header', async () => {
    const { fetch } = createMock(3);

    const first = await fetch('https://api.example.com/events');
    const cursor = first.headers.get('x-next-cursor') ?? '';
    const last = await fetch('https://api.example.com/events', { headers: { 'X-Cursor': cursor } });

    expect(ids(await last.json())).toEqual(['C1-3']);
    expect(last.headers.has('x-next-cursor')).toBe(false);
    const bad = await fetch('https://api.example.com/events', { headers: { 'X-Cursor': 'nope' } });
    expect(bad.status).toBe(400);
  });

  it('follows Link headers until there is no next page', async () => {
    const { fetch } = createMock(5);
    const pages: string[][] = [];
    let url: string | undefined = 'https://api.example.com/issues?per_page=2';
    while (url) {
      const response: Response = await fetch(url);
      pages.push(ids(await response.json()));
      url = /<([^>]+)>; rel="next"/.exec(response.headers.get('link') ?? '')?.[1];
    }

    expect(pages).toEqual([['C1-1', 'C1-2'], ['C1-3', 'C1-4'], ['C1-5']]);
  });

  it('keeps the request parameters in Link URLs', async () => {
    const response = await createMock(5).fetch('https://api.example.com/issues?per_page=2');

    expect(response.headers.get('link')).toBe(
      '<https://api.example.com/issues?per_page=2&page=2>; rel="next"'
    );
  });

  it('follows next-page URLs in the body until the field is missing', async () => {
    const { fetch, calls } = createMock(3);

    const first = await (await fetch('https://api.example.com/users?$top=2')).json();
    const last = await (await fetch(first['@odata.nextLink'])).json();

    expect([ids(first), ids(last)]).toEqual([['C1-1', 'C1-2'], ['C1-3']]);
    expect(last).not.toHaveProperty(['@odata.nextLink']);
    expect(calls.map(({ status }) => status)).toEqual([200, 200]);
  });

  describe('with recorded pages', () => {
    const recordedPages = [
      slackPage(undefined, ['CA', 'CB'], 'dXNlcjpVMDYx'),
      slackPage('dXNlcjpVMDYx', ['CC'], ''),
    ];

    it('serves the recorded items and hands out the recorded cursors', async () => {
      const { fetch } = createRecordedMock(recordedPages);

      const first = await getJson(fetch, '/conversations.list?limit=2');
      const last = await getJson(fetch, '/conversations.list?limit=2&cursor=dXNlcjpVMDYx');

      expect([ids(first.body), first.body.response_metadata.next_cursor]).toEqual([
        ['CA', 'CB'],
        'dXNlcjpVMDYx',
      ]);
      expect([ids(last.body), last.body.response_metadata.next_cursor]).toEqual([['CC'], '']);
    });

    it('maps recorded cursors to their position whatever the page size', async () => {
      const { fetch } = createRecordedMock(recordedPages);

      const { body } = await getJson(fetch, '/conversations.list?limit=1&cursor=dXNlcjpVMDYx');

      expect(ids(body)).toEqual(['CC']);
    });

    it('joins pages recorded out of order or more than once', async () => {
      const { fetch } = createRecordedMock([recordedPages[1], recordedPages[0], recordedPages[0]]);

      const { body } = await getJson(fetch, '/conversations.list?limit=10');

      expect(ids(body)).toEqual(['CA', 'CB', 'CC']);
    });

    it('pads the recorded items to the requested collection size', async () => {
      const { fetch } = createRecordedMock(recordedPages, 5);

      const { body } = await getJson(fetch, '/conversations.list?limit=10');

      expect(ids(body)).toEqual(['CA', 'CB', 'CC', 'CC-2', 'CC-3']);
    });

    it('reads recorded cursors from next-page URLs', async () => {
      const users = { method: 'GET', path: '/users' };
      const { fetch } = createRecordedMock([
        {
          operation: users,
          request: { query: { $top: '1' } },
          response: {
            status: 200,
            body: {
              channels: toChannels('U1'),
              '@odata.nextLink': 'https://api.example.com/users?$top=1&$skiptoken=X1',
            },
          },
        },
        {
          operation: users,
          request: { query: { $top: '1', $skiptoken: 'X1' } },
          response: { status: 200, body: { channels: toChannels('U2') } },
        },
      ]);

      const first = await getJson(fetch, '/users?$top=1');
      const { body } = await getJson(fetch, '/users?$top=1&$skiptoken=X1');

      expect(new URL(first.body['@odata.nextLink']).searchParams.get('$skiptoken')).toBe('X1');
      expect([ids(first.body), ids(body)]).toEqual([['U1'], ['U2']]);
    });

    it('ignores recordings for operations with a fixture', async () => {
      const { fetch } = createContractMockFetch({
        specs: [spec],
        pagination,
        recordings: [{ exchanges: recordedPages }],
        fixtures: [
          {
            operation: { method: 'GET', path: '/conversations.list' },
            response: { status: 200, body: { channels: toChannels('F') } },
          },
        ],
      });

      const { body } = await getJson(fetch, '/conversations.list?limit=10');

      expect(ids(body)).toEqual(['F-1', 'F-2', 'F-3']);
    });
  });
});
