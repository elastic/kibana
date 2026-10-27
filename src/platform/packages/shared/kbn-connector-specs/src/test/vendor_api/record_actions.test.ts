/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActionDefinition, ConnectorSpec } from '../../connector_spec';
import { recordActions } from './record_actions';

const item = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
const ok = (schema: unknown) => ({
  description: 'ok',
  content: { 'application/json': { schema } },
});

const specFor = (version: string, paths: Record<string, unknown>) => ({
  openapi: '3.0.3',
  info: { title: 'Example', version },
  servers: [{ url: `https://api.example.com/${version}` }],
  security: [{ bearer: [] }],
  paths,
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
});

const specs = {
  v1: specFor('v1', {
    '/items': {
      get: {
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', maximum: 5 } }],
        responses: { '200': ok({ type: 'array', items: item }) },
      },
      post: {
        requestBody: { content: { 'application/json': { schema: item } } },
        responses: { '201': ok(item) },
      },
    },
    '/items/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': ok(item) },
      },
    },
  }),
  v2: specFor('v2', { '/items': { get: { responses: { '200': ok({ type: 'array' }) } } } }),
};

const V1 = 'https://api.example.com/v1';
const V2 = 'https://api.example.com/v2';

const action = <T>(
  input: z.ZodType<T>,
  handler: ActionDefinition<T>['handler']
): ActionDefinition<T> => ({ input, handler, scope: 'read' });

const connector: ConnectorSpec = {
  metadata: {
    id: '.example',
    displayName: 'Example',
    description: 'Example',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: { types: ['bearer'] },
  test: { enabled: false, handler: async () => ({}) },
  actions: {
    listItems: action(
      z.object({ limit: z.number().int().min(1).max(5).optional() }),
      async ({ client }, { limit }) => {
        await client.get(`${V1}/items`, { params: { limit } });
        return (await client.get(`${V2}/items`)).data;
      }
    ),
    getItem: action(
      z.object({ id: z.string() }),
      async ({ client }, { id }) => (await client.get(`${V1}/items/${id}`)).data
    ),
    createItem: action(
      z.object({ name: z.string() }),
      async ({ client }, body) => (await client.post(`${V1}/items`, body)).data
    ),
    tooMany: action(
      z.object({ limit: z.number().int().min(10) }),
      async ({ client }, { limit }) => (await client.get(`${V1}/items`, { params: { limit } })).data
    ),
    legacy: action(z.object({}), async ({ client }) => (await client.get(`${V1}/legacy`)).data),
    refined: action(
      z.object({ id: z.string().refine((id) => id.startsWith('ID-'), 'Needs ID-') }),
      async () => ({})
    ),
  },
};

describe('recordActions', () => {
  it('records the operations each action calls, by source', async () => {
    const { operations } = await recordActions({ connector, specs });

    expect(operations).toEqual({
      createItem: [{ source: 'v1', method: 'post', path: '/items' }],
      getItem: [{ source: 'v1', method: 'get', path: '/items/{id}' }],
      legacy: [],
      listItems: [
        { source: 'v1', method: 'get', path: '/items' },
        { source: 'v2', method: 'get', path: '/items' },
      ],
      refined: [],
      tooMany: [{ source: 'v1', method: 'get', path: '/items' }],
    });
  });

  it('records requests that match no operation, and the handler errors they cause', async () => {
    const { unmatched, findings } = await recordActions({ connector, specs });

    expect(unmatched).toEqual({ legacy: [{ method: 'get', path: '/v1/legacy' }] });
    expect(findings).toContainEqual({
      kind: 'handler-error',
      action: 'legacy',
      message: 'Request failed with status code 404',
    });
  });

  it('reports requests the spec rejects and actions without an accepted input', async () => {
    const { findings } = await recordActions({ connector, specs });

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'request-violation',
        action: 'tooMany',
        violations: [expect.objectContaining({ code: 'maximum' })],
      })
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ kind: 'no-input', action: 'refined' })
    );
  });

  it('merges fixture inputs and checks read-only actions', async () => {
    const { findings } = await recordActions({
      connector,
      specs,
      fixtures: { createItem: { readOnly: true }, refined: { input: { id: 'ID-1' } } },
    });

    expect(findings).toContainEqual({
      kind: 'read-only',
      action: 'createItem',
      request: `POST ${V1}/items`,
    });
    expect(findings).not.toContainEqual(
      expect.objectContaining({ kind: 'no-input', action: 'refined' })
    );
  });

  it('serves response overrides and reports those the spec contradicts', async () => {
    const { findings } = await recordActions({
      connector,
      specs,
      fixtures: {
        getItem: {
          responses: [{ method: 'GET', path: '/items/{id}', status: 200, body: { id: 1 } }],
        },
        listItems: {
          responses: [{ source: 'v3', method: 'GET', path: '/items', status: 200, body: [] }],
        },
      },
    });

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'rejected-response',
        action: 'getItem',
        operation: 'GET /items/{id}',
        violations: [expect.objectContaining({ code: 'required' })],
      })
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ kind: 'rejected-response', action: 'listItems' })
    );
  });
});
