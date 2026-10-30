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
  handler: ActionDefinition<T>['handler'],
  scope: ActionDefinition<T>['scope'] = 'read'
): ActionDefinition<T> => ({ input, handler, scope });

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
      async ({ client }, body) => (await client.post(`${V1}/items`, body)).data,
      'write'
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

  it('merges fixture inputs', async () => {
    const { findings } = await recordActions({
      connector,
      specs,
      fixtures: { refined: { input: { id: 'ID-1' } } },
    });

    expect(findings).not.toContainEqual(
      expect.objectContaining({ kind: 'no-input', action: 'refined' })
    );
  });

  it("allows 'read' scoped actions only safe methods and the queries their fixtures list", async () => {
    const searching: ConnectorSpec = {
      ...connector,
      actions: {
        ...connector.actions,
        searchItems: action(
          z.object({ name: z.string() }),
          async ({ client }, body) => (await client.post(`${V1}/items`, body)).data
        ),
      },
    };
    const readScope = (fixtures = {}) =>
      recordActions({ connector: searching, specs, fixtures }).then(({ findings }) =>
        findings.filter(({ kind }) => kind === 'read-scope' || kind === 'unused-query')
      );

    expect(await readScope()).toEqual([
      { kind: 'read-scope', action: 'searchItems', request: `POST ${V1}/items` },
    ]);
    expect(
      await readScope({ searchItems: { queries: [{ method: 'POST', path: '/items' }] } })
    ).toEqual([]);
    expect(
      await readScope({
        getItem: { queries: [{ method: 'POST', path: '/items' }] },
        searchItems: { queries: [{ source: 'v2', method: 'POST', path: '/items' }] },
      })
    ).toEqual([
      { kind: 'unused-query', action: 'getItem', operation: 'POST /items' },
      { kind: 'read-scope', action: 'searchItems', request: `POST ${V1}/items` },
      { kind: 'unused-query', action: 'searchItems', operation: 'POST /items' },
    ]);
  });

  it('matches queries against the path of requests that match no operation', async () => {
    const mcp: ConnectorSpec = {
      ...connector,
      actions: {
        callTool: action(z.object({}), async ({ client }) =>
          client.post(`${V1}/mcp/tools`, {}).catch(() => undefined)
        ),
      },
    };
    const readScope = (fixtures = {}) =>
      recordActions({ connector: mcp, specs, fixtures }).then(({ findings }) =>
        findings.filter(({ kind }) => kind === 'read-scope' || kind === 'unused-query')
      );

    expect(await readScope()).toEqual([
      { kind: 'read-scope', action: 'callTool', request: `POST ${V1}/mcp/tools` },
    ]);
    expect(
      await readScope({ callTool: { queries: [{ method: 'POST', path: '/v1/mcp/{name}' }] } })
    ).toEqual([]);
  });

  it('runs actions with a config sampled from the connector schema, unless one is given', async () => {
    const configured: ConnectorSpec = {
      ...connector,
      schema: z.object({
        region: z.enum(['us', 'eu']),
        debug: z.boolean().optional(),
        apiUrl: z.string().default(V1),
      }),
      actions: {
        getItem: action(z.object({}), async ({ client, config }) => {
          if (config?.region === undefined || 'debug' in config) {
            throw new Error(`Unexpected config ${JSON.stringify(config)}`);
          }
          return (await client.get(`${config.apiUrl}/items/${config.region}`)).data;
        }),
      },
    };

    expect((await recordActions({ connector: configured, specs })).findings).toEqual([]);
    expect(
      (await recordActions({ connector: configured, specs, config: { region: 'eu', debug: true } }))
        .findings
    ).toEqual([expect.objectContaining({ kind: 'no-auth-type', action: 'getItem' })]);
    await expect(
      recordActions({ connector: configured, specs, config: { debug: true } })
    ).rejects.toThrow(/^The connector config is invalid: .*region/s);
  });

  it('merges fixture config into the config of the action', async () => {
    const configured: ConnectorSpec = {
      ...connector,
      schema: z.object({ serverUrl: z.url().optional() }),
      actions: {
        getItem: action(z.object({}), async ({ client, config }) => {
          if (config?.serverUrl === undefined) {
            throw new Error('The server URL is required');
          }
          return (await client.get(`${config.serverUrl}/v1/items/1`)).data;
        }),
      },
    };

    expect((await recordActions({ connector: configured, specs })).operations.getItem).toEqual([]);
    const { operations, findings } = await recordActions({
      connector: configured,
      specs,
      fixtures: { getItem: { config: { serverUrl: 'https://api.example.com' } } },
    });
    expect(findings).toEqual([]);
    expect(operations.getItem).toHaveLength(1);
    await expect(
      recordActions({
        connector: configured,
        specs,
        fixtures: { getItem: { config: { serverUrl: 'not a url' } } },
      })
    ).rejects.toThrow(/^The config of getItem is invalid: /);
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

  describe('with several auth types', () => {
    const needsBasic = 'Only available with basic authentication';
    const v1 = specs.v1;
    const multiAuthSpecs = {
      v1: {
        ...v1,
        security: [{ bearer: [] }, { basic: [] }],
        components: {
          securitySchemes: {
            ...v1.components.securitySchemes,
            basic: { type: 'http', scheme: 'basic' },
          },
        },
      },
    };
    const multiAuth: ConnectorSpec = {
      ...connector,
      auth: { types: ['bearer', 'basic'] },
      actions: {
        basicOnly: action(z.object({}), async ({ client, secrets }) => {
          if (secrets?.authType !== 'basic') {
            throw new Error(needsBasic);
          }
          return (await client.get(`${V1}/items`)).data;
        }),
        never: action(z.object({}), async () => {
          throw new Error('Never available');
        }),
      },
    };

    it('records the union of the operations each auth type reaches', async () => {
      const { operations, findings } = await recordActions({
        connector: multiAuth,
        specs: multiAuthSpecs,
      });

      expect(operations.basicOnly).toEqual([{ source: 'v1', method: 'get', path: '/items' }]);
      expect(findings).not.toContainEqual(expect.objectContaining({ action: 'basicOnly' }));
    });

    it('reports an action that sends no request under any auth type', async () => {
      const { findings } = await recordActions({ connector: multiAuth, specs: multiAuthSpecs });

      expect(findings).toContainEqual({
        kind: 'no-auth-type',
        action: 'never',
        errors: { bearer: 'Never available', basic: 'Never available' },
      });
    });

    it('records only the given auth type when one is passed', async () => {
      const { operations, findings } = await recordActions({
        connector: multiAuth,
        specs: multiAuthSpecs,
        authType: 'bearer',
      });

      expect(operations.basicOnly).toEqual([]);
      expect(findings).toContainEqual({
        kind: 'no-auth-type',
        action: 'basicOnly',
        errors: { bearer: needsBasic },
      });
    });

    it('reports auth types the contract context rejects, and fails when none is left', async () => {
      const { findings } = await recordActions({
        connector: multiAuth,
        specs: multiAuthSpecs,
        secrets: { username: '' },
      });

      expect(findings).toContainEqual(
        expect.objectContaining({ kind: 'auth-type-error', authType: 'basic' })
      );
      await expect(
        recordActions({
          connector: multiAuth,
          specs: multiAuthSpecs,
          authType: 'basic',
          secrets: { username: '' },
        })
      ).rejects.toThrow(/Auth type basic/);
    });
  });
});
