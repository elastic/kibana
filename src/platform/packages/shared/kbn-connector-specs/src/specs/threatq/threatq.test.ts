/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { Request, Response, Headers } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import { z } from '@kbn/zod/v4';
import type { ActionContext } from '../../connector_spec';
import { BearerAuth } from '../../auth_types/bearer';
import { OAuth } from '../../auth_types/oauth';
import { OAuthPassword } from '../../auth_types/oauth_password';
import { generateSecretsSchemaFromSpec } from '../../lib/generate_secrets_schema_from_spec';
import type { JsonValue } from './types';
import { ThreatQ } from './threatq';
import {
  SearchIndicatorsInputSchema,
  SearchObjectsInputSchema,
  GetIndicatorInputSchema,
  GetObjectInputSchema,
  CreateIndicatorInputSchema,
  ExecutePluginInputSchema,
} from './types';

// Use the server HTTP client under this package's jsdom test environment.
jest.mock('axios', () => jest.requireActual('axios/dist/node/axios.cjs'));

let nock: typeof import('nock');

const origin = 'https://threatq.example.com';
const secrets = { token: 'test-token' };
const response = { total: 1, data: [{ id: 123 }], nextCursorMark: 'next-page' };

const authenticatedApi = () => nock(origin, { reqheaders: { authorization: 'Bearer test-token' } });

describe('ThreatQ', () => {
  let ctx: ActionContext;
  const originalFetchClasses = {
    Request: globalThis.Request,
    Response: globalThis.Response,
    Headers: globalThis.Headers,
  };

  beforeAll(() => {
    // Nock captures these classes on import; jsdom supplies incompatible fetch polyfills.
    Object.assign(globalThis, { Request, Response, Headers });
    nock = jest.requireActual('nock');
    nock.disableNetConnect();
  });
  beforeEach(async () => {
    const log = loggerMock.create();
    const client = await BearerAuth.configure(
      {
        getCustomHostSettings: () => undefined,
        getToken: async () => null,
        logger: log,
        sslSettings: {},
      },
      axios.create({ proxy: false, adapter: 'http' }),
      secrets
    );
    ctx = {
      client,
      config: { url: origin },
      secrets,
      log,
      getClient: jest.fn(),
    };
  });
  const execute = (action: string, input: Record<string, JsonValue>) =>
    ThreatQ.actions[action].handler(ctx, input);
  const runTest = () => ThreatQ.test.handler(ctx);
  afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
  });
  afterAll(() => {
    nock.enableNetConnect();
    Object.assign(globalThis, originalFetchClasses);
  });

  it('sends search criteria and filters in the body and pagination in the query', async () => {
    const criteria = { value: { '+contains': 'example.com' } };
    const filters = {
      '+and': [{ type_name: 'FQDN' }, { status_name: 'Active' }, { score: { '+gte': 6 } }],
    };
    authenticatedApi()
      .post('/api/indicators/query', { criteria, filters })
      .query({ limit: 10, offset: 20, sort: '-created_at,id' })
      .reply(200, response);
    const input = SearchIndicatorsInputSchema.parse({
      criteria,
      filters,
      limit: 10,
      offset: 20,
      sort: '-created_at,id',
    });
    await expect(execute('searchIndicators', input)).resolves.toEqual(response);
  });

  it('retains the cursor and omits offset during a Threat Library cursor search', async () => {
    authenticatedApi()
      .post('/api/campaign/query', { criteria: { title: 'Example' } })
      .query({ limit: 50, cursorMark: '*', sort: 'id' })
      .reply(200, response);
    const input = SearchObjectsInputSchema.parse({
      objectType: 'campaign',
      criteria: { title: 'Example' },
      cursorMark: '*',
      offset: 100,
      sort: 'id',
    });
    await expect(execute('searchObjects', input)).resolves.toEqual(response);
  });

  it.each(['report', 'reports'])(
    'preserves the selected %s search endpoint',
    async (objectType) => {
      authenticatedApi()
        .post(`/api/${objectType}/query`, {})
        .query({ limit: 50, offset: 0 })
        .reply(200, response);
      await expect(
        execute('searchObjects', SearchObjectsInputSchema.parse({ objectType }))
      ).resolves.toEqual(response);
    }
  );

  it('includes indicator context by default and accepts an instance-specific relationship list', async () => {
    authenticatedApi()
      .get('/api/indicators/123')
      .query({ with: 'attributes,sources,score,status,adversaries,events' })
      .reply(200, response);
    await expect(
      execute('getIndicator', GetIndicatorInputSchema.parse({ indicatorId: 123 }))
    ).resolves.toEqual(response);
    authenticatedApi()
      .get('/api/indicators/123')
      .query({ with: 'adversaries,malware,attributes,campaign,report,events,score' })
      .reply(200, response);
    await execute(
      'getIndicator',
      GetIndicatorInputSchema.parse({
        indicatorId: 123,
        with: ['adversaries', 'malware', 'attributes', 'campaign', 'report', 'events', 'score'],
      })
    );
  });

  it.each(['adversaries', 'events', 'report'])(
    'reads %s with comma-separated customer relationship names',
    async (objectType) => {
      authenticatedApi()
        .get(`/api/${objectType}/123`)
        .query({ with: 'descriptions,ttp,attack_pattern' })
        .reply(200, response);
      const input = GetObjectInputSchema.parse({
        objectType,
        objectId: 123,
        with: ['descriptions', 'ttp', 'attack_pattern'],
      });
      await expect(execute('getObject', input)).resolves.toEqual(response);
    }
  );

  it('reads an object without forcing version-specific relationships', async () => {
    authenticatedApi().get('/api/report/123').reply(200, response);
    await expect(execute('getObject', { objectType: 'report', objectId: 123 })).resolves.toEqual(
      response
    );
  });

  it.each(['indicators', 'events', 'adversaries'])(
    'gets related %s with pagination',
    async (relatedType) => {
      authenticatedApi()
        .get(`/api/indicators/123/${relatedType}`)
        .query({ limit: 25, offset: 50, with: 'sources' })
        .reply(200, response);
      await expect(
        execute('getRelatedObjects', {
          objectType: 'indicators',
          objectId: 123,
          relatedType,
          limit: 25,
          offset: 50,
          with: ['sources'],
        })
      ).resolves.toEqual(response);
    }
  );

  it('creates an indicator with an array body and preserves source metadata', async () => {
    const sources = [
      { name: 'Elastic Security', tlp: { name: 'AMBER' }, published_at: '2026-09-16 10:00:00' },
    ];
    authenticatedApi()
      .post('/api/indicators', [{ value: 'example.com', type_id: 7, status_id: 4, sources }])
      .reply(201, response);
    const input = CreateIndicatorInputSchema.parse({
      value: 'example.com',
      typeId: 7,
      statusId: 4,
      sources,
    });
    await expect(execute('createIndicator', input)).resolves.toEqual(response);
  });

  it('updates only the indicator status', async () => {
    authenticatedApi().put('/api/indicators/123', { status_id: 4 }).reply(201, response);
    await expect(
      execute('updateIndicatorStatus', { indicatorId: 123, statusId: 4 })
    ).resolves.toEqual(response);
  });

  it.each(['indicators', 'events', 'adversaries'])(
    'adds an attribute to %s',
    async (objectType) => {
      const sources = [{ name: 'Elastic Security' }];
      authenticatedApi()
        .post(`/api/${objectType}/123/attributes`, {
          name: 'Disposition',
          value: 'Reviewed',
          sources,
        })
        .reply(201, response);
      await expect(
        execute('addAttribute', {
          objectType,
          objectId: 123,
          name: 'Disposition',
          value: 'Reviewed',
          sources,
        })
      ).resolves.toEqual(response);
    }
  );

  it('creates an event with the API timestamp field', async () => {
    authenticatedApi()
      .post('/api/events', {
        title: 'Example event',
        type: 'Spearphish',
        happened_at: '2026-09-16 10:00:00',
      })
      .reply(201, response);
    await expect(
      execute('createEvent', {
        title: 'Example event',
        type: 'Spearphish',
        happenedAt: '2026-09-16 10:00:00',
      })
    ).resolves.toEqual(response);
  });

  it('creates an adversary with source records', async () => {
    const input = { name: 'Example actor', sources: [{ name: 'Elastic Security' }] };
    authenticatedApi().post('/api/adversaries', input).reply(201, response);
    await expect(execute('createAdversary', input)).resolves.toEqual(response);
  });

  it.each(['adversaries', 'events', 'indicators'])(
    'links an indicator to %s with an array of IDs',
    async (relatedType) => {
      authenticatedApi()
        .post(`/api/indicators/123/${relatedType}`, [{ id: 456 }])
        .reply(201, response);
      await expect(
        execute('linkObjects', {
          objectType: 'indicators',
          objectId: 123,
          relatedType,
          relatedId: 456,
        })
      ).resolves.toEqual(response);
    }
  );

  it.each([
    ['listIndicatorStatuses', '/indicator/statuses'],
    ['listIndicatorTypes', '/indicator/types'],
    ['listPlugins', '/plugins'],
  ])('%s uses its documented endpoint', async (action, path) => {
    authenticatedApi().get(`/api${path}`).query({ limit: 50, offset: 0 }).reply(200, response);
    await expect(execute(action, { limit: 50, offset: 0 })).resolves.toEqual(response);
  });

  it('gets plugin actions and supported object types', async () => {
    authenticatedApi()
      .get('/api/plugins/12')
      .query({ with: 'action,objectType' })
      .reply(200, response);
    await expect(execute('getPlugin', { pluginId: 12 })).resolves.toEqual(response);
  });

  it('runs a plugin with type, string ID, and action in the body', async () => {
    authenticatedApi()
      .post('/api/plugins/12/execute', { type: 'Indicator', id: '123', action: 'whois' })
      .reply(201, response);
    const input = ExecutePluginInputSchema.parse({
      pluginId: 12,
      type: 'Indicator',
      objectId: 123,
      action: 'whois',
    });
    await expect(execute('executePlugin', input)).resolves.toEqual(response);
    expect(ThreatQ.actions.executePlugin).toMatchObject({ isTool: false, scope: 'destroy' });
  });

  it('attributes a status update to the configured source', async () => {
    ctx.config = { url: origin, defaultSource: 'Elastic Security' };
    authenticatedApi()
      .put('/api/indicators/123', {
        status_id: 6,
        sources: [{ name: 'Elastic Security' }],
      })
      .reply(200, response);
    await expect(
      execute('updateIndicatorStatus', { indicatorId: 123, statusId: 6 })
    ).resolves.toEqual(response);
  });

  it('sends plugin action parameters in the request body', async () => {
    const parameters = { msg: 'Elastic Security rule', action: 'alert', create_signature: false };
    authenticatedApi()
      .post('/api/plugins/5/execute', {
        type: 'indicator',
        id: '123',
        action: 'generate',
        parameters,
      })
      .reply(201, response);
    await expect(
      execute('executePlugin', {
        pluginId: 5,
        type: 'indicator',
        objectId: 123,
        action: 'generate',
        parameters,
      })
    ).resolves.toEqual(response);
  });

  it.each([origin, `${origin}/`, `${origin}/api`, `${origin}/api/`])(
    'tests connectivity with URL %s',
    async (url) => {
      ctx.config = { url };
      authenticatedApi().get('/api/indicator/types').query({ limit: 1 }).reply(200, response);
      await expect(runTest()).resolves.toEqual({
        message: 'Connected to ThreatQ.',
      });
    }
  );

  it.each([401, 403, 404, 429, 500])(
    'reports API HTTP %s without exposing the response body or token',
    async (status) => {
      authenticatedApi()
        .get('/api/indicator/types')
        .query({ limit: 1 })
        .reply(status, { error: 'test-token' });
      await expect(runTest()).rejects.toThrow(
        `ThreatQ request failed (HTTP ${status}). Check the account permissions, input, and instance connection.`
      );
    }
  );

  it('does not follow an API redirect or retry a plugin operation', async () => {
    authenticatedApi()
      .post('/api/plugins/12/execute')
      .reply(307, '', { Location: 'https://other.example.com/execute' });
    await expect(
      execute('executePlugin', {
        pluginId: 12,
        type: 'Indicator',
        objectId: 123,
        action: 'whois',
      })
    ).rejects.toThrow('ThreatQ request failed (HTTP 307)');
  });

  it('requires a bearer token through the generated secrets schema', () => {
    const schema = generateSecretsSchemaFromSpec(ThreatQ.auth);
    expect(schema.safeParse({ authType: 'bearer', ...secrets }).success).toBe(true);
    expect(schema.safeParse({ authType: 'bearer' }).success).toBe(false);
    expect(schema.safeParse({ authType: 'bearer', token: '' }).success).toBe(false);
  });

  it('requires user credentials and sets the ThreatQ password grant options', () => {
    const schema = generateSecretsSchemaFromSpec(ThreatQ.auth);
    const valid = {
      authType: 'oauth_password',
      tokenUrl: `${origin}/api/token`,
      username: 'user@example.com',
      password: 'user-password',
      clientId: 'api-password',
    };
    expect(schema.parse(valid)).toMatchObject({
      usernameField: 'email',
      requestBodyFormat: 'json',
      tokenType: 'Bearer',
    });
    for (const field of ['tokenUrl', 'username', 'password', 'clientId']) {
      expect(schema.safeParse({ ...valid, [field]: undefined }).success).toBe(false);
      expect(schema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
    }
    expect(
      schema.safeParse({ ...valid, tokenUrl: 'http://threatq.example.com/api/token' }).success
    ).toBe(false);
  });

  it('uses a password grant token for user authentication', async () => {
    const getToken = jest.fn().mockResolvedValue('Bearer user-token');
    const userSecrets: Parameters<typeof OAuthPassword.configure>[2] = {
      tokenUrl: `${origin}/api/token`,
      username: 'user@example.com',
      password: 'user-password',
      clientId: 'api-password',
      usernameField: 'email',
      requestBodyFormat: 'json',
      tokenType: 'Bearer',
    };
    ctx.client = await OAuthPassword.configure(
      { getCustomHostSettings: () => undefined, getToken, logger: ctx.log, sslSettings: {} },
      ctx.client,
      userSecrets
    );
    nock(origin, { reqheaders: { authorization: 'Bearer user-token' } })
      .get('/api/indicator/types')
      .query({ limit: 1 })
      .reply(200, response);
    await expect(runTest()).resolves.toEqual({ message: 'Connected to ThreatQ.' });
    expect(getToken).toHaveBeenCalledWith({ authType: 'oauth_password', ...userSecrets });
  });

  it('requires OAuth credentials and defaults to HTTP Basic token authentication', () => {
    const schema = generateSecretsSchemaFromSpec(ThreatQ.auth);
    const valid = {
      authType: 'oauth_client_credentials',
      tokenUrl: `${origin}/api/token`,
      clientId: 'oauth-client',
      clientSecret: 'oauth-secret',
    };
    expect(schema.parse(valid)).toMatchObject({
      tokenEndpointAuthMethod: 'client_secret_basic',
      tokenType: 'Bearer',
    });
    for (const field of ['tokenUrl', 'clientId', 'clientSecret']) {
      expect(schema.safeParse({ ...valid, [field]: undefined }).success).toBe(false);
      expect(schema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
    }
  });

  it('uses the token from the existing OAuth client credentials provider', async () => {
    const getToken = jest.fn().mockResolvedValue('Bearer oauth-token');
    ctx.client = await OAuth.configure(
      { getCustomHostSettings: () => undefined, getToken, logger: ctx.log, sslSettings: {} },
      ctx.client,
      {
        tokenUrl: `${origin}/api/token`,
        clientId: 'oauth-client',
        clientSecret: 'oauth-secret',
        tokenEndpointAuthMethod: 'client_secret_basic',
        tokenType: 'Bearer',
      }
    );
    nock(origin, { reqheaders: { authorization: 'Bearer oauth-token' } })
      .get('/api/indicator/types')
      .query({ limit: 1 })
      .reply(200, response);
    await expect(ThreatQ.test.handler(ctx)).resolves.toEqual({ message: 'Connected to ThreatQ.' });
    expect(getToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenEndpointAuthMethod: 'client_secret_basic',
        tokenType: 'Bearer',
      })
    );
    expect(ThreatQ.auth?.types[0]).toMatchObject({
      type: 'oauth_client_credentials',
      defaults: { tokenEndpointAuthMethod: 'client_secret_basic' },
      isRecommended: true,
    });
  });

  it.each(['oauth_password', 'oauth_client_credentials'])(
    '%s requires a secure ThreatQ token endpoint',
    (authType) => {
      const schema = generateSecretsSchemaFromSpec(ThreatQ.auth);
      const credentials = {
        authType,
        username: 'user@example.com',
        password: 'user-password',
        clientId: 'client',
        clientSecret: 'secret',
      };
      for (const tokenUrl of [
        'http://threatq.example.com/api/token',
        'https://user:password@threatq.example.com/api/token',
        'https://threatq.example.com/api/token?password=secret',
        'https://threatq.example.com/api/token#fragment',
        'https://threatq.example.com/other',
      ]) {
        expect(schema.safeParse({ ...credentials, tokenUrl }).success).toBe(false);
      }
      expect(schema.safeParse({ ...credentials, tokenUrl: `${origin}/api/token` }).success).toBe(
        true
      );
    }
  );

  it.each(['searchIndicators', 'searchObjects'])(
    '%s sends fields in the body and relationships in the query',
    async (action) => {
      authenticatedApi()
        .post('/api/indicators/query', { fields: ['id', 'value'] })
        .query({ limit: 50, offset: 0, with: 'sources,attributes' })
        .reply(200, response);
      const input = ThreatQ.actions[action].input.parse({
        objectType: 'indicators',
        fields: ['id', 'value'],
        with: ['sources', 'attributes'],
      });
      await expect(execute(action, input)).resolves.toEqual(response);
    }
  );

  it('adds tags with an array body', async () => {
    authenticatedApi()
      .post('/api/indicators/123/tags', [{ name: 'Elastic triage' }, { name: 'EICAR' }])
      .reply(201, response);
    await expect(
      execute('addTags', {
        objectType: 'indicators',
        objectId: 123,
        tags: ['Elastic triage', 'EICAR'],
      })
    ).resolves.toEqual(response);
  });

  it('creates a custom object and supplies the configured default source', async () => {
    ctx.config = { url: origin, defaultSource: 'Elastic Security' };
    authenticatedApi()
      .post('/api/custom_object', { value: 'Example', sources: [{ name: 'Elastic Security' }] })
      .reply(201, response);
    await expect(
      execute('createObject', { objectType: 'custom_object', body: { value: 'Example' } })
    ).resolves.toEqual(response);
  });

  it('keeps explicit sources instead of replacing them with the default', async () => {
    ctx.config = { url: origin, defaultSource: 'Elastic Security' };
    authenticatedApi()
      .post('/api/custom_object', { value: 'Example', sources: [{ name: 'Analyst' }] })
      .reply(201, response);
    await execute('createObject', {
      objectType: 'custom_object',
      body: { value: 'Example', sources: [{ name: 'Analyst' }] },
    });
  });
});

describe('ThreatQ input schemas', () => {
  it.each([
    'http://threatq.example.com',
    'https://user:password@threatq.example.com',
    `${origin}?key=value`,
    `${origin}#fragment`,
    `${origin}/other`,
    'not a URL',
  ])('rejects an unsafe or unsupported URL: %s', (url) => {
    expect(ThreatQ.schema?.safeParse({ url }).success).toBe(false);
  });

  it.each(['../token', 'https://other.example.com', 'indicators?with=secrets'])(
    'rejects endpoint injection: %s',
    (objectType) => {
      expect(GetObjectInputSchema.safeParse({ objectType, objectId: 1 }).success).toBe(false);
    }
  );

  it.each([-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, '../token'])(
    'rejects invalid IDs: %s',
    (objectId) => {
      expect(GetObjectInputSchema.safeParse({ objectType: 'report', objectId }).success).toBe(
        false
      );
    }
  );

  it('bounds page size, query keys, query strings, relationship lists, and nested arrays', () => {
    expect(SearchIndicatorsInputSchema.safeParse({ limit: 501 }).success).toBe(false);
    expect(
      SearchIndicatorsInputSchema.safeParse({ criteria: { ['a'.repeat(101)]: 'x' } }).success
    ).toBe(false);
    expect(
      SearchIndicatorsInputSchema.safeParse({ criteria: { value: 'a'.repeat(2001) } }).success
    ).toBe(false);
    expect(
      SearchIndicatorsInputSchema.safeParse({ criteria: { '+or': Array(51).fill('x') } }).success
    ).toBe(false);
    expect(
      GetIndicatorInputSchema.safeParse({ indicatorId: 1, with: Array(31).fill('sources') }).success
    ).toBe(false);
  });

  it('bounds query depth, entry counts, and total query size', () => {
    const deep = { a: { a: { a: { a: { a: { a: { a: 'x' } } } } } } };
    expect(SearchIndicatorsInputSchema.safeParse({ criteria: deep }).success).toBe(false);
    expect(
      SearchIndicatorsInputSchema.safeParse({
        criteria: Object.fromEntries(
          Array.from({ length: 51 }, (_, index) => [String(index), 'x'])
        ),
      }).success
    ).toBe(false);
    expect(
      SearchIndicatorsInputSchema.safeParse({
        criteria: { '+or': Array(20).fill('x'.repeat(2000)) },
      }).success
    ).toBe(false);
  });

  it('requires an initial indicator status and rejects empty writes', () => {
    expect(CreateIndicatorInputSchema.safeParse({ value: 'example.com', typeId: 7 }).success).toBe(
      false
    );
    expect(ThreatQ.actions.updateIndicatorStatus.input.safeParse({ indicatorId: 1 }).success).toBe(
      false
    );
  });

  it('serializes every action schema for tool and workflow discovery', () => {
    for (const action of Object.values(ThreatQ.actions)) {
      expect(() => z.toJSONSchema(action.input)).not.toThrow();
    }
  });
});
