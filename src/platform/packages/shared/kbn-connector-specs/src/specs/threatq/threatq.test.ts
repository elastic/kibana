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
import { BasicAuth } from '../../auth_types/basic';
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
const secrets = { username: 'analyst@example.com', password: 'test-password' };
const tokenBody = {
  email: secrets.username,
  password: secrets.password,
  grant_type: 'password',
  client_id: 'test-client',
};
const response = { total: 1, data: [{ id: 123 }], nextCursorMark: 'next-page' };

const authenticate = () =>
  nock(origin)
    .post('/api/token', tokenBody)
    .matchHeader('content-type', 'application/json')
    .matchHeader('authorization', (value) => value === undefined)
    .reply(200, { access_token: 'test-token', token_type: 'bearer', expires_in: 3600 });

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
    const client = await BasicAuth.configure(
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
      config: { url: origin, clientId: 'test-client' },
      secrets,
      log,
      getClient: jest.fn(),
    };
  });
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
    authenticate();
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
    await expect(ThreatQ.actions.searchIndicators.handler(ctx, input)).resolves.toEqual(response);
  });

  it('retains the cursor and omits offset during a Threat Library cursor search', async () => {
    authenticate();
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
    await expect(ThreatQ.actions.searchObjects.handler(ctx, input)).resolves.toEqual(response);
  });

  it.each(['report', 'reports'])(
    'preserves the selected %s search endpoint',
    async (objectType) => {
      authenticate();
      authenticatedApi()
        .post(`/api/${objectType}/query`, {})
        .query({ limit: 50, offset: 0 })
        .reply(200, response);
      await expect(
        ThreatQ.actions.searchObjects.handler(ctx, SearchObjectsInputSchema.parse({ objectType }))
      ).resolves.toEqual(response);
    }
  );

  it('includes indicator context by default and accepts an instance-specific relationship list', async () => {
    authenticate();
    authenticatedApi()
      .get('/api/indicators/123')
      .query({ with: 'attributes,sources,score,status,adversaries,events' })
      .reply(200, response);
    await expect(
      ThreatQ.actions.getIndicator.handler(ctx, GetIndicatorInputSchema.parse({ indicatorId: 123 }))
    ).resolves.toEqual(response);
    authenticate();
    authenticatedApi()
      .get('/api/indicators/123')
      .query({ with: 'adversaries,malware,attributes,campaign,report,events,score' })
      .reply(200, response);
    await ThreatQ.actions.getIndicator.handler(
      ctx,
      GetIndicatorInputSchema.parse({
        indicatorId: 123,
        with: ['adversaries', 'malware', 'attributes', 'campaign', 'report', 'events', 'score'],
      })
    );
  });

  it.each(['adversaries', 'events', 'report'])(
    'reads %s with comma-separated customer relationship names',
    async (objectType) => {
      authenticate();
      authenticatedApi()
        .get(`/api/${objectType}/123`)
        .query({ with: 'descriptions,ttp,attack_pattern' })
        .reply(200, response);
      const input = GetObjectInputSchema.parse({
        objectType,
        objectId: 123,
        with: ['descriptions', 'ttp', 'attack_pattern'],
      });
      await expect(ThreatQ.actions.getObject.handler(ctx, input)).resolves.toEqual(response);
    }
  );

  it('reads an object without forcing version-specific relationships', async () => {
    authenticate();
    authenticatedApi().get('/api/report/123').reply(200, response);
    await expect(
      ThreatQ.actions.getObject.handler(ctx, { objectType: 'report', objectId: 123 })
    ).resolves.toEqual(response);
  });

  it.each(['indicators', 'events', 'adversaries'])(
    'gets related %s with pagination',
    async (relatedType) => {
      authenticate();
      authenticatedApi()
        .get(`/api/indicators/123/${relatedType}`)
        .query({ limit: 25, offset: 50, with: 'sources' })
        .reply(200, response);
      await expect(
        ThreatQ.actions.getRelatedObjects.handler(ctx, {
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
    authenticate();
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
    await expect(ThreatQ.actions.createIndicator.handler(ctx, input)).resolves.toEqual(response);
  });

  it('updates only the indicator status', async () => {
    authenticate();
    authenticatedApi().put('/api/indicators/123', { status_id: 4 }).reply(201, response);
    await expect(
      ThreatQ.actions.updateIndicatorStatus.handler(ctx, { indicatorId: 123, statusId: 4 })
    ).resolves.toEqual(response);
  });

  it.each(['indicators', 'events', 'adversaries'])(
    'adds an attribute to %s',
    async (objectType) => {
      authenticate();
      const sources = [{ name: 'Elastic Security' }];
      authenticatedApi()
        .post(`/api/${objectType}/123/attributes`, {
          name: 'Disposition',
          value: 'Reviewed',
          sources,
        })
        .reply(201, response);
      await expect(
        ThreatQ.actions.addAttribute.handler(ctx, {
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
    authenticate();
    authenticatedApi()
      .post('/api/events', {
        title: 'Example event',
        type: 'Spearphish',
        happened_at: '2026-09-16 10:00:00',
      })
      .reply(201, response);
    await expect(
      ThreatQ.actions.createEvent.handler(ctx, {
        title: 'Example event',
        type: 'Spearphish',
        happenedAt: '2026-09-16 10:00:00',
      })
    ).resolves.toEqual(response);
  });

  it('creates an adversary with source records', async () => {
    authenticate();
    const input = { name: 'Example actor', sources: [{ name: 'Elastic Security' }] };
    authenticatedApi().post('/api/adversaries', input).reply(201, response);
    await expect(ThreatQ.actions.createAdversary.handler(ctx, input)).resolves.toEqual(response);
  });

  it.each(['adversaries', 'events', 'indicators'])(
    'links an indicator to %s with an array of IDs',
    async (relatedType) => {
      authenticate();
      authenticatedApi()
        .post(`/api/indicators/123/${relatedType}`, [{ id: 456 }])
        .reply(201, response);
      await expect(
        ThreatQ.actions.linkObjects.handler(ctx, {
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
    authenticate();
    authenticatedApi().get(`/api${path}`).query({ limit: 50, offset: 0 }).reply(200, response);
    await expect(ThreatQ.actions[action].handler(ctx, { limit: 50, offset: 0 })).resolves.toEqual(
      response
    );
  });

  it('gets plugin actions and supported object types', async () => {
    authenticate();
    authenticatedApi()
      .get('/api/plugins/12')
      .query({ with: 'action,objectType' })
      .reply(200, response);
    await expect(ThreatQ.actions.getPlugin.handler(ctx, { pluginId: 12 })).resolves.toEqual(
      response
    );
  });

  it('runs a plugin with type, string ID, and action in the body', async () => {
    authenticate();
    authenticatedApi()
      .post('/api/plugins/12/execute', { type: 'Indicator', id: '123', action: 'whois' })
      .reply(201, response);
    const input = ExecutePluginInputSchema.parse({
      pluginId: 12,
      type: 'Indicator',
      objectId: 123,
      action: 'whois',
    });
    await expect(ThreatQ.actions.executePlugin.handler(ctx, input)).resolves.toEqual(response);
    expect(ThreatQ.actions.executePlugin).toMatchObject({ isTool: false, scope: 'destroy' });
  });

  it.each([origin, `${origin}/`, `${origin}/api`, `${origin}/api/`])(
    'tests connectivity with URL %s',
    async (url) => {
      ctx.config = { url, clientId: 'test-client' };
      authenticate();
      authenticatedApi().get('/api/indicator/types').query({ limit: 1 }).reply(200, response);
      await expect(ThreatQ.test.handler(ctx)).resolves.toEqual({
        message: 'Connected to ThreatQ.',
      });
    }
  );

  it('gets a new token for each action without retaining it in client defaults', async () => {
    for (const token of ['first-token', 'second-token']) {
      nock(origin).post('/api/token', tokenBody).reply(200, { access_token: token });
      nock(origin, { reqheaders: { authorization: `Bearer ${token}` } })
        .get('/api/indicator/types')
        .query({ limit: 1 })
        .reply(200, response);
      await ThreatQ.test.handler(ctx);
    }
    expect(ctx.client.defaults.headers.common.Authorization).toBeUndefined();
    expect(ctx.client.defaults.auth).toBeUndefined();
  });

  it('does not expose credentials from an authentication failure', async () => {
    nock(origin).post('/api/token', tokenBody).reply(401, { password: secrets.password });
    await expect(ThreatQ.test.handler(ctx)).rejects.toThrow(
      'ThreatQ authentication failed (HTTP 401). Check the account credentials and client ID.'
    );
    expect(ctx.log.error).not.toHaveBeenCalled();
  });

  it.each([{}, { access_token: '' }, { access_token: 123 }])(
    'rejects a token response without a usable access token: %j',
    async (body) => {
      nock(origin).post('/api/token', tokenBody).reply(200, body);
      await expect(ThreatQ.test.handler(ctx)).rejects.toThrow('ThreatQ authentication failed');
    }
  );

  it.each([401, 403, 404, 429, 500])(
    'reports API HTTP %s without exposing the response body or token',
    async (status) => {
      authenticate();
      authenticatedApi()
        .get('/api/indicator/types')
        .query({ limit: 1 })
        .reply(status, { error: 'test-token' });
      await expect(ThreatQ.test.handler(ctx)).rejects.toThrow(
        `ThreatQ request failed (HTTP ${status}). Check the account permissions, input, and instance connection.`
      );
    }
  );

  it('does not follow an authentication redirect', async () => {
    nock(origin)
      .post('/api/token', tokenBody)
      .reply(307, '', { Location: 'https://other.example.com/token' });
    await expect(ThreatQ.test.handler(ctx)).rejects.toThrow(
      'ThreatQ authentication failed (HTTP 307)'
    );
  });

  it('does not follow an API redirect or retry a plugin operation', async () => {
    authenticate();
    authenticatedApi()
      .post('/api/plugins/12/execute')
      .reply(307, '', { Location: 'https://other.example.com/execute' });
    await expect(
      ThreatQ.actions.executePlugin.handler(ctx, {
        pluginId: 12,
        type: 'Indicator',
        objectId: 123,
        action: 'whois',
      })
    ).rejects.toThrow('ThreatQ request failed (HTTP 307)');
  });

  it('rejects missing credentials before making any requests', async () => {
    ctx.secrets = {};
    await expect(ThreatQ.test.handler(ctx)).rejects.toThrow('ThreatQ requires');
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
    expect(ThreatQ.schema?.safeParse({ url, clientId: 'client' }).success).toBe(false);
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
