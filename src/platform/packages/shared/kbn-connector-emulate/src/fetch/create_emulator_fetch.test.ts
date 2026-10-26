/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Responder } from '../contract/types';
import { createEmulatorFetch } from './create_emulator_fetch';

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

describe('createEmulatorFetch', () => {
  it('answers valid requests with the responder and records the call', async () => {
    const respond = jest.fn(listResponder);
    const { fetch, calls } = createEmulatorFetch({ specs: [spec], respond });

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
    const { fetch } = createEmulatorFetch({
      specs: [spec],
      respond: () => ({ statusCode: 204, headers: json, body: { name: 'a' } }),
    });

    const response = await fetch(`${BASE_URL}/items`);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('answers unmatched requests with 404 naming the request', async () => {
    const { fetch } = createEmulatorFetch({ specs: [spec], respond: listResponder });

    const response = await fetch(`${BASE_URL}/unknown`);

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toContain('GET https://api.example.com/v1/unknown');
  });

  it.each([
    ['out of bounds', 'limit=500', ['query', 'limit'], 'maximum'],
    ['undeclared', 'offset=1', ['query', 'offset'], 'undeclared'],
    ['repeated explode: false', 'ids=a&ids=b', ['query', 'ids'], 'explode'],
  ])('answers %s query parameters with 422', async (_, search, path, code) => {
    const { fetch, calls } = createEmulatorFetch({ specs: [spec], respond: listResponder });

    const response = await fetch(`${BASE_URL}/items?${search}`);
    const { operation, violations } = await response.json();

    expect(response.status).toBe(422);
    expect(operation).toBe('listItems');
    expect(violations).toEqual([expect.objectContaining({ path, code })]);
    expect(calls[0].status).toBe(422);
  });

  it('accepts comma-separated values for explode: false parameters', async () => {
    const { fetch } = createEmulatorFetch({ specs: [spec], respond: listResponder });

    expect((await fetch(`${BASE_URL}/items?ids=a,b`)).status).toBe(200);
  });

  it('validates JSON request bodies', async () => {
    const respond: Responder = () => ({ statusCode: 201, headers: json, body: { name: 'a' } });
    const { fetch } = createEmulatorFetch({ specs: [spec], respond });

    const invalid = await fetch(`${BASE_URL}/items`, postJson({ title: 'a' }));
    const valid = await fetch(`${BASE_URL}/items`, postJson({ name: 'a' }));

    expect(invalid.status).toBe(422);
    expect((await invalid.json()).violations).toEqual([
      expect.objectContaining({ code: 'required' }),
    ]);
    expect(valid.status).toBe(201);
  });

  describe('with JSON bodies that are strings', () => {
    const notes = {
      ...spec,
      paths: {
        '/notes': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { type: ['string', 'null'] } } },
              },
            },
          },
          post: {
            requestBody: { content: { 'application/json': { schema: { type: 'string' } } } },
            responses: { '204': { description: 'created' } },
          },
        },
      },
    };

    it('reports request bodies that are not JSON, though the raw text fits the schema', async () => {
      const { fetch, calls } = createEmulatorFetch({ specs: [notes] });
      const post = (body: string) =>
        fetch(`${BASE_URL}/notes`, { method: 'POST', headers: json, body });

      const malformed = await post('hello');
      const valid = await post('"hello"');

      expect(malformed.status).toBe(422);
      expect(calls[0].requestViolations).toEqual([
        expect.objectContaining({ path: ['body'], code: 'syntax' }),
      ]);
      expect(valid.status).toBe(204);
    });

    it.each([
      ['hello', '"hello"'],
      [null, 'null'],
    ])('serializes the JSON response body %j', async (body, text) => {
      const { fetch } = createEmulatorFetch({
        specs: [notes],
        respond: () => ({ statusCode: 200, headers: json, body }),
      });

      const response = await fetch(`${BASE_URL}/notes`);

      expect(await response.text()).toBe(text);
    });

    it('keeps NDJSON request bodies as text instead of reporting a JSON syntax error', async () => {
      const { fetch, calls } = createEmulatorFetch({
        specs: [
          {
            ...notes,
            paths: {
              '/bulk': {
                post: {
                  requestBody: {
                    content: { 'application/x-ndjson': { schema: { type: 'string' } } },
                  },
                  responses: { '204': { description: 'indexed' } },
                },
              },
            },
          },
        ],
      });

      const response = await fetch(`${BASE_URL}/bulk`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-ndjson' },
        body: '{"a":1}\n{"b":2}\n',
      });

      expect(response.status).toBe(204);
      expect(calls[0].requestViolations).toEqual([]);
    });

    it('sends a JSON text sequence response body as it is', async () => {
      const sequence = '\u001e{"a":1}\n\u001e{"b":2}\n';
      const { fetch } = createEmulatorFetch({
        specs: [notes],
        respond: () => ({
          statusCode: 200,
          headers: { 'content-type': 'application/json-seq' },
          body: sequence,
        }),
      });

      const response = await fetch(`${BASE_URL}/notes`);

      expect(await response.text()).toBe(sequence);
    });
  });

  describe('with a responder in front of the default chain', () => {
    const CREATED = Symbol('created items');
    // Remembers created items for the run and lists them back; defers the rest to next().
    const remember: Responder = async (operation, request, { state, next }) => {
      const created = (state.get(CREATED) as unknown[] | undefined) ?? [];
      if (operation.id === 'createItem') {
        state.set(CREATED, [...created, request.body]);
        return { statusCode: 201, headers: json, body: request.body };
      }
      if (operation.id === 'listItems') {
        return { statusCode: 200, headers: json, body: created };
      }
      return next();
    };

    it('keeps state across requests until reset, and validates its answers', async () => {
      const { fetch, calls, reset } = createEmulatorFetch({ specs: [spec], respond: remember });

      await fetch(`${BASE_URL}/items`, postJson({ name: 'a' }));
      const listed = await fetch(`${BASE_URL}/items`);
      reset();
      const afterReset = await fetch(`${BASE_URL}/items`);

      expect(await listed.json()).toEqual([{ name: 'a' }]);
      expect(await afterReset.json()).toEqual([]);
      expect(calls).toEqual([
        expect.objectContaining({ operation: 'listItems', status: 200, responseViolations: [] }),
      ]);
    });

    it('sees requests the default chain would answer, which next() then answers', async () => {
      const seen: string[] = [];
      const { fetch } = createEmulatorFetch({
        specs: [spec],
        fixtures: [
          {
            operation: { method: 'get', path: '/items' },
            response: { status: 200, body: [{ name: 'fixture' }] },
          },
        ],
        respond: async (operation, _request, { next }) => {
          seen.push(operation.id);
          return next();
        },
      });

      const response = await fetch(`${BASE_URL}/items`);

      expect(seen).toEqual(['listItems']);
      expect(await response.json()).toEqual([{ name: 'fixture' }]);
    });

    it('reports answers that break the spec', async () => {
      const { fetch, calls } = createEmulatorFetch({
        specs: [spec],
        respond: async () => ({ statusCode: 200, headers: json, body: [{ id: 1 }] }),
      });

      await fetch(`${BASE_URL}/items`);

      expect(calls[0].responseViolations).toEqual([expect.objectContaining({ code: 'required' })]);
    });
  });

  it('records responses that break the spec', async () => {
    const respond: Responder = () => ({ statusCode: 200, headers: json, body: [{ id: 1 }] });
    const { fetch, calls } = createEmulatorFetch({ specs: [spec], respond });

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
      const { fetch, calls } = createEmulatorFetch({ specs: { v1: spec, v2 } });

      await fetch('https://api.example.com/v2/items');

      expect(calls[0].matched).toEqual({ source: 'v2', method: 'get', path: '/items' });
    });

    it('applies fixtures to the spec they name, or to every spec', async () => {
      const named = createEmulatorFetch({ specs: { v1: spec, v2 }, fixtures: [fixture('v2')] });
      const unnamed = createEmulatorFetch({ specs: { v1: spec, v2 }, fixtures: [fixture()] });
      const bodyOf = async (mockFetch: typeof fetch, version: string) =>
        (await mockFetch(`https://api.example.com/${version}/items`)).json();

      expect(await bodyOf(named.fetch, 'v2')).toEqual([{ name: 'v2' }]);
      expect(await bodyOf(named.fetch, 'v1')).toEqual([{ name: 'string' }]);
      expect(await bodyOf(unnamed.fetch, 'v1')).toEqual([{ name: 'any' }]);
      expect(await bodyOf(unnamed.fetch, 'v2')).toEqual([{ name: 'any' }]);
    });

    it('rejects fixtures naming a spec without the operation', () => {
      const { rejectedResponses } = createEmulatorFetch({
        specs: { v1: spec },
        fixtures: [fixture('v2')],
      });

      expect(rejectedResponses).toEqual([
        expect.objectContaining({ source: 'fixture', operation: 'GET /items', spec: 'v2' }),
      ]);
    });

    it('names the spec a recording contradicts', () => {
      const listOf = (schema: object) => ({
        description: 'ok',
        content: { 'application/json': { schema: { type: 'array', items: schema } } },
      });
      const strict = {
        ...spec,
        paths: {
          '/items': {
            get: { responses: { '200': listOf({ ...item, required: ['name', 'id'] }) } },
          },
        },
      };
      const { rejectedResponses } = createEmulatorFetch({
        specs: { v1: spec, v2: strict },
        recordings: [{ exchanges: [fixture()] }],
      });

      expect(rejectedResponses).toEqual([
        expect.objectContaining({ source: 'recording', operation: 'GET /items', spec: 'v2' }),
      ]);
    });
  });
});
