/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
import type { GraphQLSpec } from './graphql_protocol';

const SDL = `
  type Query {
    board(id: ID!): Board
    boards(limit: Int): [Board!]!
    node(id: ID!): Node
  }
  type Mutation {
    archiveItem(itemId: ID!): Item
  }
  interface Node {
    id: ID!
  }
  enum State {
    active
    archived
  }
  scalar ISO8601DateTime
  type Board implements Node {
    id: ID!
    name: String!
    state: State!
    updated_at: ISO8601DateTime
    items_page: ItemsPage!
  }
  type ItemsPage {
    cursor: String
    has_more: Boolean!
    items: [Item!]!
  }
  type Item implements Node {
    id: ID!
    name: String
  }
`;

const ENDPOINT = 'https://api.example.com/v2';

const spec: GraphQLSpec = { format: 'graphql', sdl: SDL, endpoints: [ENDPOINT] };

const post = (mockFetch: typeof fetch, body: unknown, url = ENDPOINT) =>
  mockFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GraphQL specs', () => {
  it('answers a query with sampled values for exactly the selected fields', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: { monday: spec } });

    const response = await post(mockFetch, {
      query: `query Boards($limit: Int, $id: ID!) {
        boards(limit: $limit) { id state updated_at items_page { cursor has_more items { name } } }
        board(id: $id) { name }
      }`,
      variables: { limit: 5, id: '1' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        boards: [
          {
            id: 'string',
            state: 'active',
            updated_at: '2026-01-01T00:00:00Z',
            items_page: { cursor: 'string', has_more: false, items: [{ name: 'string' }] },
          },
        ],
        board: { name: 'string' },
      },
    });
    expect(calls).toEqual([
      expect.objectContaining({
        request: `POST ${ENDPOINT}`,
        operation: 'query boards',
        matched: { name: 'query boards', source: 'monday' },
        readOnly: true,
        status: 200,
        requestViolations: [],
      }),
      expect.objectContaining({
        operation: 'query board',
        matched: { name: 'query board', source: 'monday' },
      }),
    ]);
  });

  it('marks mutations as not read-only', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, {
      query: 'mutation Archive($id: ID!) { archiveItem(itemId: $id) { id } }',
      variables: { id: '42' },
    });

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      expect.objectContaining({ matched: { name: 'mutation archiveItem' }, readOnly: false }),
    ]);
  });

  it('counts root fields selected through fragments, and resolves abstract types', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, {
      query: `query {
        __typename
        ...Roots
        ... on Query { node(id: "1") { __typename ... on Board { name } } }
      }
      fragment Roots on Query { boards { id } }`,
    });

    expect(await response.json()).toEqual({
      data: {
        __typename: 'Query',
        boards: [{ id: 'string' }],
        node: { __typename: 'Board', name: 'string' },
      },
    });
    expect(calls.map(({ operation }) => operation)).toEqual(['query boards', 'query node']);
  });

  it('rejects documents that break the schema, and still records the operations', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, { query: '{ boards { id title } }' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: [{ message: expect.stringContaining('Cannot query field "title" on type "Board"') }],
    });
    expect(calls).toEqual([
      expect.objectContaining({
        operation: 'query boards',
        status: 400,
        requestViolations: [
          {
            path: ['body', 'query'],
            code: 'validation',
            message: expect.stringContaining('"title"'),
          },
        ],
      }),
    ]);
  });

  it('rejects variables that do not coerce to their declared types', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, {
      query: 'query ($limit: Int) { boards(limit: $limit) { id } }',
      variables: { limit: 'ten' },
    });

    expect(response.status).toBe(400);
    expect(calls[0].requestViolations).toEqual([
      { path: ['body', 'variables'], code: 'coercion', message: expect.stringContaining('$limit') },
    ]);
  });

  it.each([
    ['a body without a query', { variables: {} }, ['body', 'query'], 'required'],
    ['a query that does not parse', { query: '{ boards { id }' }, ['body', 'query'], 'syntax'],
    [
      'an unknown operation name',
      { query: 'query A { boards { id } }', operationName: 'B' },
      ['body', 'operationName'],
      'operation',
    ],
  ])('rejects %s without recording an operation', async (_, body, path, code) => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, body);

    expect(response.status).toBe(400);
    expect(calls).toEqual([
      expect.objectContaining({
        status: 400,
        requestViolations: [expect.objectContaining({ path, code })],
      }),
    ]);
    expect(calls[0].matched).toBeUndefined();
  });

  it('answers queries sent with GET, but not mutations', async () => {
    const { fetch: mockFetch } = createContractMockFetch({ specs: [spec] });
    const get = (query: string) =>
      mockFetch(`${ENDPOINT}/?${new URLSearchParams({ query })}`, { method: 'GET' });

    expect((await get('{ boards { id } }')).status).toBe(200);
    expect((await get('mutation { archiveItem(itemId: "1") { id } }')).status).toBe(400);
  });

  it('executes against schemas that declare @defer and @stream, and does not stream them', async () => {
    const directives = `
      directive @defer(label: String, if: Boolean! = true) on FRAGMENT_SPREAD | INLINE_FRAGMENT
      directive @stream(label: String, if: Boolean! = true, initialCount: Int = 0) on FIELD
    `;
    const { fetch: mockFetch } = createContractMockFetch({
      specs: [{ ...spec, sdl: `${directives}${SDL}` }],
    });

    expect((await post(mockFetch, { query: '{ boards { id } }' })).status).toBe(200);
    const deferred = await post(mockFetch, { query: '{ ... @defer { boards { id } } }' });
    expect(deferred.status).toBe(501);
  });

  it('leaves other URLs to the OpenAPI specs', async () => {
    const { fetch: mockFetch, calls } = createContractMockFetch({ specs: [spec] });

    const response = await post(mockFetch, { query: '{ boards { id } }' }, `${ENDPOINT}/other`);

    expect(response.status).toBe(404);
    expect(calls[0].matched).toBeUndefined();
  });
});
