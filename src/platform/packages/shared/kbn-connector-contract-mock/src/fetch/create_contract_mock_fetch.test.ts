/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Responder } from '../contract/types';
import { createContractMockFetch } from './create_contract_mock_fetch';

const item = {
  type: 'object',
  required: ['name'],
  properties: { name: { type: 'string' } },
};

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
          {
            name: 'ids',
            in: 'query',
            explode: false,
            schema: { type: 'array', items: { type: 'string' } },
          },
        ],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { type: 'array', items: item } } },
          },
        },
      },
      post: {
        operationId: 'createItem',
        requestBody: { required: true, content: { 'application/json': { schema: item } } },
        responses: {
          '201': { description: 'created', content: { 'application/json': { schema: item } } },
        },
      },
    },
  },
};

const BASE_URL = 'https://api.example.com/v1';
const json = { 'content-type': 'application/json' };
const listResponder: Responder = () => ({ statusCode: 200, headers: json, body: [{ name: 'a' }] });

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: json,
  body: JSON.stringify(body),
});

describe('createContractMockFetch', () => {
  it('answers valid requests with the responder and records the call', async () => {
    const respond = jest.fn(listResponder);
    const { fetch, calls } = createContractMockFetch({ specs: [spec], respond });

    const response = await fetch(`${BASE_URL}/items?limit=10`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ name: 'a' }]);
    expect(respond.mock.calls[0][1].query).toEqual({ limit: '10' });
    expect(calls).toEqual([
      {
        request: 'GET https://api.example.com/v1/items',
        operation: 'listItems',
        matched: { method: 'get', path: '/items' },
        status: 200,
        requestViolations: [],
        responseViolations: [],
      },
    ]);
  });

  it('sends no body with 204 responses, even when the responder gives one', async () => {
    const { fetch } = createContractMockFetch({
      specs: [spec],
      respond: () => ({ statusCode: 204, headers: json, body: { name: 'a' } }),
    });

    const response = await fetch(`${BASE_URL}/items`);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('answers unmatched requests with 404 naming the request', async () => {
    const { fetch } = createContractMockFetch({ specs: [spec], respond: listResponder });

    const response = await fetch(`${BASE_URL}/unknown`);

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toContain('GET https://api.example.com/v1/unknown');
  });

  it.each([
    ['out of bounds', 'limit=500', ['query', 'limit'], 'maximum'],
    ['undeclared', 'offset=1', ['query', 'offset'], 'undeclared'],
    ['repeated explode: false', 'ids=a&ids=b', ['query', 'ids'], 'explode'],
  ])('answers %s query parameters with 422', async (_, search, path, code) => {
    const { fetch, calls } = createContractMockFetch({ specs: [spec], respond: listResponder });

    const response = await fetch(`${BASE_URL}/items?${search}`);
    const { operation, violations } = await response.json();

    expect(response.status).toBe(422);
    expect(operation).toBe('listItems');
    expect(violations).toEqual([expect.objectContaining({ path, code })]);
    expect(calls[0].status).toBe(422);
  });

  it('accepts comma-separated values for explode: false parameters', async () => {
    const { fetch } = createContractMockFetch({ specs: [spec], respond: listResponder });

    expect((await fetch(`${BASE_URL}/items?ids=a,b`)).status).toBe(200);
  });

  it('validates JSON request bodies', async () => {
    const respond: Responder = () => ({ statusCode: 201, headers: json, body: { name: 'a' } });
    const { fetch } = createContractMockFetch({ specs: [spec], respond });

    const invalid = await fetch(`${BASE_URL}/items`, postJson({ title: 'a' }));
    const valid = await fetch(`${BASE_URL}/items`, postJson({ name: 'a' }));

    expect(invalid.status).toBe(422);
    expect((await invalid.json()).violations).toEqual([
      expect.objectContaining({ code: 'required' }),
    ]);
    expect(valid.status).toBe(201);
  });

  it('records responses that break the spec', async () => {
    const respond: Responder = () => ({ statusCode: 200, headers: json, body: [{ id: 1 }] });
    const { fetch, calls } = createContractMockFetch({ specs: [spec], respond });

    await fetch(`${BASE_URL}/items`);

    expect(calls[0].responseViolations).toEqual([expect.objectContaining({ code: 'required' })]);
  });

  describe('with named specs', () => {
    const v2 = { ...spec, servers: [{ url: 'https://api.example.com/v2' }] };
    const fixture = (source?: string) => ({
      operation: { method: 'GET', path: '/items', ...(source ? { source } : {}) },
      response: { status: 200, body: [{ name: source ?? 'any' }] },
    });

    it('records which spec each call matched', async () => {
      const { fetch, calls } = createContractMockFetch({ specs: { v1: spec, v2 } });

      await fetch('https://api.example.com/v2/items');

      expect(calls[0].matched).toEqual({ source: 'v2', method: 'get', path: '/items' });
    });

    it('applies fixtures to the spec they name, or to every spec', async () => {
      const named = createContractMockFetch({ specs: { v1: spec, v2 }, fixtures: [fixture('v2')] });
      const unnamed = createContractMockFetch({ specs: { v1: spec, v2 }, fixtures: [fixture()] });
      const bodyOf = async (mockFetch: typeof fetch, version: string) =>
        (await mockFetch(`https://api.example.com/${version}/items`)).json();

      expect(await bodyOf(named.fetch, 'v2')).toEqual([{ name: 'v2' }]);
      expect(await bodyOf(named.fetch, 'v1')).toEqual([{ name: 'string' }]);
      expect(await bodyOf(unnamed.fetch, 'v1')).toEqual([{ name: 'any' }]);
      expect(await bodyOf(unnamed.fetch, 'v2')).toEqual([{ name: 'any' }]);
    });

    it('rejects fixtures naming a spec without the operation', () => {
      const { rejectedResponses } = createContractMockFetch({
        specs: { v1: spec },
        fixtures: [fixture('v2')],
      });

      expect(rejectedResponses).toEqual([
        expect.objectContaining({ source: 'fixture', operation: 'GET /items' }),
      ]);
    });
  });
});
