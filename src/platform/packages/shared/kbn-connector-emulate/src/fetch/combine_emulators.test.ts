/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '../openapi';
import { combineEmulators, emulatorCredential } from './combine_emulators';
import { createEmulatorFetch } from './create_emulator_fetch';

const GRAPH = 'https://graph.vendor.example/v1.0';
const TOKEN_URL = 'https://login.vendor.example/token';

const profile = { type: 'object', properties: { name: { type: 'string' } } };

// Two connectors on one vendor host, as Outlook and OneDrive share Microsoft Graph.
const graphSpec = (path: string): OpenApiDocument => ({
  openapi: '3.0.3',
  info: { title: 'Graph', version: '1' },
  servers: [{ url: GRAPH }],
  components: {
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        flows: { clientCredentials: { tokenUrl: TOKEN_URL, scopes: {} } },
      },
    },
  },
  security: [{ oauth: [] }],
  paths: {
    '/me': {
      get: {
        operationId: 'getMe',
        responses: {
          '200': { description: 'ok', content: { 'application/json': { schema: profile } } },
        },
      },
    },
    [path]: {
      get: {
        operationId: `get${path.replace(/\W/g, '')}`,
        responses: { '204': { description: 'ok' } },
      },
    },
  },
});

// A vendor host that comes from connector config, as Zendesk's does.
const tenantSpec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Tenant', version: '1' },
  servers: [
    { url: 'https://{subdomain}.tenant.example/api', variables: { subdomain: { default: 'x' } } },
  ],
  paths: {
    '/tickets': {
      get: { operationId: 'listTickets', responses: { '204': { description: 'ok' } } },
    },
  },
};

// A self-hosted product: its relative server matches any host, and `/{a}/{b}` most paths.
const selfHostedSpec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Self-hosted', version: '1' },
  servers: [{ url: '/' }],
  paths: {
    '/{a}/{b}': { get: { operationId: 'getItem', responses: { '204': { description: 'ok' } } } },
  },
};

// A self-hosted product whose server is only a host variable, as Okta's `https://{yourOktaDomain}`.
const anyHostSpec: OpenApiDocument = {
  ...selfHostedSpec,
  servers: [{ url: 'https://{host}', variables: { host: { default: 'example.com' } } }],
};

// The same, with the host variable limited to the vendor's regions.
const regionHostSpec: OpenApiDocument = {
  ...selfHostedSpec,
  servers: [
    {
      url: 'https://{region}',
      variables: { region: { default: 'eu.region.example', enum: ['eu.region.example'] } },
    },
  ],
};

const vendorSpec: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Vendor', version: '1' },
  servers: [{ url: 'https://api.vendor.example/v2' }],
  components: {
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        flows: {
          clientCredentials: { tokenUrl: 'https://auth.vendor.example/a/token', scopes: {} },
        },
      },
    },
  },
  paths: {
    '/scrape': { post: { operationId: 'scrape', responses: { '204': { description: 'ok' } } } },
  },
};

const fixture = (name: string) => [
  { operation: { method: 'get', path: '/me' }, response: { status: 200, body: { name } } },
];

const bearer = (token: string): RequestInit => ({ headers: { authorization: `Bearer ${token}` } });

const createCombined = () =>
  combineEmulators({
    outlook: createEmulatorFetch({
      specs: [graphSpec('/me/messages')],
      fixtures: fixture('outlook'),
    }),
    one_drive: createEmulatorFetch({
      specs: [graphSpec('/me/drive')],
      fixtures: fixture('one_drive'),
    }),
    tenant: createEmulatorFetch({ specs: [tenantSpec] }),
  });

describe('combineEmulators', () => {
  it('routes a request to the connector its credential names, with that connector’s fixtures', async () => {
    const { fetch, calls } = createCombined();

    const response = await fetch(`${GRAPH}/me`, bearer(emulatorCredential('one_drive')));

    expect(await response.json()).toEqual({ name: 'one_drive' });
    expect(calls).toEqual([
      expect.objectContaining({ operation: 'getMe', connector: 'one_drive', status: 200 }),
    ]);
  });

  it('routes untagged requests to the first connector whose specs match the URL', async () => {
    const { fetch, calls } = createCombined();

    expect(await (await fetch(`${GRAPH}/me`, bearer('any'))).json()).toEqual({ name: 'outlook' });
    expect((await fetch(`${GRAPH}/me/drive`, bearer('any'))).status).toBe(204);
    expect((await fetch('https://acme.tenant.example/api/tickets')).status).toBe(204);
    expect(calls.map(({ connector, operation }) => [connector, operation])).toEqual([
      ['outlook', 'getMe'],
      ['one_drive', 'getmedrive'],
      ['tenant', 'listTickets'],
    ]);
  });

  describe('with a connector whose relative server matches any host', () => {
    const createWithSelfHosted = () =>
      combineEmulators({
        self_hosted: createEmulatorFetch({ specs: [selfHostedSpec] }),
        vendor: createEmulatorFetch({ specs: [vendorSpec] }),
      });

    it('routes to the connector whose specs name the host, even when it comes later', async () => {
      const { fetch, calls } = createWithSelfHosted();

      const response = await fetch('https://api.vendor.example/v2/scrape', { method: 'POST' });

      expect(response.status).toBe(204);
      expect(calls).toEqual([
        expect.objectContaining({ connector: 'vendor', operation: 'scrape', status: 204 }),
      ]);
    });

    it('routes token requests to the connector whose specs name the token host', async () => {
      const { fetch, calls } = createWithSelfHosted();

      await fetch('https://auth.vendor.example/a/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials&client_id=id',
      });

      expect(calls).toEqual([expect.objectContaining({ connector: 'vendor', token: true })]);
    });

    it('still reaches the relative server on hosts no spec names', async () => {
      const { fetch, calls, answers, namesHost } = createWithSelfHosted();
      const url = 'https://argocd.internal.example/x/y';

      expect((await fetch(url)).status).toBe(204);

      expect(calls).toEqual([
        expect.objectContaining({ connector: 'self_hosted', operation: 'getItem' }),
      ]);
      expect(answers('GET', new URL(url))).toBe(true);
      expect(namesHost('GET', new URL(url))).toBe(false);
    });

    it('lets the credential pick the relative server on a named host', async () => {
      const { fetch, calls } = createWithSelfHosted();

      await fetch('https://api.vendor.example/x/y', bearer(emulatorCredential('self_hosted')));

      expect(calls).toEqual([expect.objectContaining({ connector: 'self_hosted' })]);
    });
  });

  describe('with a connector whose server is only a host variable', () => {
    const createWithAnyHost = (spec: OpenApiDocument) =>
      combineEmulators({
        any_host: createEmulatorFetch({ specs: [spec] }),
        vendor: createEmulatorFetch({ specs: [vendorSpec] }),
      });

    it('routes to the connector whose specs name the host, even when it comes later', async () => {
      const { fetch, calls, namesHost } = createWithAnyHost(anyHostSpec);

      await fetch('https://api.vendor.example/v2/scrape', { method: 'POST' });

      expect(calls).toEqual([
        expect.objectContaining({ connector: 'vendor', operation: 'scrape' }),
      ]);
      expect(namesHost('GET', new URL('https://okta.internal.example/x/y'))).toBe(false);
    });

    it('still reaches that server on hosts no spec names', async () => {
      const { fetch, calls } = createWithAnyHost(anyHostSpec);

      expect((await fetch('https://okta.internal.example/x/y')).status).toBe(204);
      expect(calls).toEqual([
        expect.objectContaining({ connector: 'any_host', operation: 'getItem' }),
      ]);
    });

    it('names the host when an enum limits the variable', () => {
      const { namesHost } = createWithAnyHost(regionHostSpec);

      expect(namesHost('GET', new URL('https://eu.region.example/x/y'))).toBe(true);
      expect(namesHost('GET', new URL('https://other.example/x/y'))).toBe(false);
    });

    it('names the host when only the scheme is a variable', async () => {
      const { fetch, calls } = combineEmulators({
        self_hosted: createEmulatorFetch({ specs: [selfHostedSpec] }),
        scheme: createEmulatorFetch({
          specs: [
            {
              ...selfHostedSpec,
              servers: [
                {
                  url: '{scheme}://api.scheme.example',
                  variables: { scheme: { default: 'https', enum: ['http', 'https'] } },
                },
              ],
            },
          ],
        }),
      });

      await fetch('https://api.scheme.example/x/y');

      expect(calls).toEqual([expect.objectContaining({ connector: 'scheme' })]);
    });

    it('names the host of an absolute token URL', async () => {
      const { fetch, calls } = combineEmulators({
        self_hosted: createEmulatorFetch({ specs: [selfHostedSpec] }),
        any_host: createEmulatorFetch({
          specs: [
            {
              ...anyHostSpec,
              components: {
                securitySchemes: {
                  oauth: {
                    type: 'oauth2',
                    flows: {
                      clientCredentials: {
                        tokenUrl: 'https://login.any.example/oauth/token',
                        scopes: {},
                      },
                    },
                  },
                },
              },
            },
          ],
        }),
      });

      const response = await fetch('https://login.any.example/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials&client_id=id',
      });

      expect(response.status).toBe(200);
      expect(calls).toEqual([expect.objectContaining({ connector: 'any_host', token: true })]);
    });
  });

  it('finds the credential in Basic auth, the query, the body and JWT assertions', async () => {
    const { fetch, calls } = createCombined();
    const basic = Buffer.from(`user:${emulatorCredential('one_drive')}`).toString('base64');
    const claims = Buffer.from(JSON.stringify({ iss: emulatorCredential('one_drive') })).toString(
      'base64url'
    );

    await fetch(`${GRAPH}/me`, { headers: { authorization: `Basic ${basic}` } });
    await fetch(`${GRAPH}/me?key=${emulatorCredential('one_drive')}`, bearer('any'));
    await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${emulatorCredential('one_drive')}`,
    });
    await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=eyJhbGciOiJSUzI1NiJ9.${claims}.signature`,
    });

    expect(calls.map(({ connector }) => connector)).toEqual([
      'one_drive',
      'one_drive',
      'one_drive',
      'one_drive',
    ]);
  });

  it('tags the tokens a tagged token request gets, so later requests reach the same connector', async () => {
    const { fetch, calls } = createCombined();

    const token = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${emulatorCredential('one_drive')}`,
    });
    const { access_token: accessToken } = await token.json();
    const response = await fetch(`${GRAPH}/me`, bearer(accessToken));

    expect(accessToken).toMatch(/^emulate-one_drive\./);
    expect(await response.json()).toEqual({ name: 'one_drive' });
    expect(calls.map(({ connector, token: isToken }) => [connector, isToken])).toEqual([
      ['one_drive', true],
      ['one_drive', undefined],
    ]);
  });

  it('leaves a response alone when a token request overlaps it', async () => {
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { fetch } = combineEmulators({
      outlook: createEmulatorFetch({
        specs: [graphSpec('/me/messages')],
        respond: async () => {
          await released;
          return { statusCode: 204, headers: { 'content-type': 'application/json' } };
        },
      }),
      one_drive: createEmulatorFetch({ specs: [graphSpec('/me/drive')] }),
    });

    const slow = fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const token = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${emulatorCredential('outlook')}`,
    });
    release();

    expect((await token.json()).access_token).toMatch(/^emulate-outlook\./);
    expect((await slow).status).toBe(204);
  });

  it('does not take a longer name for a shorter one', async () => {
    const { fetch, calls } = combineEmulators({
      sharepoint: createEmulatorFetch({ specs: [graphSpec('/sites')] }),
      'sharepoint-online': createEmulatorFetch({ specs: [graphSpec('/drives')] }),
    });

    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('sharepoint-online')));
    await fetch(`${GRAPH}/me`, bearer('emulate-sharepoint-other'));

    expect(calls.map(({ connector }) => connector)).toEqual(['sharepoint-online', 'sharepoint']);
  });

  it('reports requests no connector matches to onCall, and only those', async () => {
    const onCall = jest.fn();
    const { fetch } = combineEmulators(
      {
        outlook: createEmulatorFetch({ specs: [graphSpec('/me/messages')] }),
        one_drive: createEmulatorFetch({ specs: [graphSpec('/me/drive')] }),
      },
      { onCall }
    );

    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch('https://unknown.example/path');

    expect(onCall.mock.calls).toEqual([
      [expect.objectContaining({ request: 'GET https://unknown.example/path', status: 404 })],
    ]);
  });

  it('answers 404 to requests no connector matches, and records them without a connector', async () => {
    const { fetch, calls } = createCombined();

    const response = await fetch('https://unknown.example/path');

    expect(response.status).toBe(404);
    expect((await response.json()).detail).toBe(
      "GET https://unknown.example/path: no connector's specs match the URL (connectors: outlook, one_drive, tenant)"
    );
    expect(calls).toEqual([
      {
        request: 'GET https://unknown.example/path',
        status: 404,
        requestViolations: [],
        responseViolations: [],
      },
    ]);
  });

  it('leaves unmatched requests to the emulator when it combines only one', async () => {
    const { fetch, calls } = combineEmulators({
      tenant: createEmulatorFetch({ specs: [tenantSpec] }),
    });

    expect((await fetch('https://unknown.example/path')).status).toBe(404);
    expect(calls).toEqual([expect.objectContaining({ connector: 'tenant', status: 404 })]);
  });

  it('resets one connector’s calls, or all of them', async () => {
    const combined = createCombined();
    const { fetch, calls } = combined;
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('one_drive')));
    await fetch('https://unknown.example/path');

    combined.reset('outlook');
    expect(calls.map(({ connector }) => connector)).toEqual(['one_drive', undefined]);

    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    expect(calls.map(({ connector }) => connector)).toEqual(['one_drive', undefined, 'outlook']);

    combined.reset();
    expect(calls).toEqual([]);
    expect(() => combined.reset('unknown')).toThrow('No emulator for connector unknown');
  });

  it('keeps captures on each connector’s latest calls, as its emulator does', async () => {
    const combined = combineEmulators({
      outlook: createEmulatorFetch({
        specs: [graphSpec('/me/messages')],
        fixtures: fixture('outlook'),
        capture: { maxCalls: 1 },
      }),
      tenant: createEmulatorFetch({ specs: [tenantSpec], capture: true }),
      one_drive: createEmulatorFetch({ specs: [graphSpec('/me/drive')] }),
    });
    const { fetch, calls } = combined;
    const captures = () =>
      calls.map(({ connector, captured }) => [connector, captured?.request.headers.authorization]);
    const tenant = 'https://acme.tenant.example/api/tickets';

    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch(tenant, bearer('t1'));
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('one_drive')));

    expect(captures()).toEqual([
      ['outlook', undefined],
      ['tenant', '[redacted]'],
      ['outlook', '[redacted]'],
      ['one_drive', undefined],
    ]);

    // Resetting one connector moves the other connectors' calls; their limits still apply.
    combined.reset('outlook');
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
    await fetch(tenant, bearer('t2'));

    expect(captures()).toEqual([
      ['tenant', '[redacted]'],
      ['one_drive', undefined],
      ['outlook', undefined],
      ['outlook', '[redacted]'],
      ['tenant', '[redacted]'],
    ]);
  });

  it('lists each connector’s operations and rejected responses', () => {
    const { operations, rejectedResponses, answers } = combineEmulators({
      outlook: createEmulatorFetch({
        specs: [graphSpec('/me/messages')],
        fixtures: [{ operation: { method: 'get', path: '/missing' }, response: { status: 200 } }],
      }),
      tenant: createEmulatorFetch({ specs: [tenantSpec] }),
    });

    expect(operations.map(({ connector }) => connector)).toEqual(['outlook', 'outlook', 'tenant']);
    expect(rejectedResponses).toEqual([
      expect.objectContaining({
        source: 'fixture',
        operation: 'GET /missing',
        connector: 'outlook',
      }),
    ]);
    expect(answers('GET', new URL('https://acme.tenant.example/api/tickets'))).toBe(true);
    expect(answers('GET', new URL('https://unknown.example/'))).toBe(false);
  });

  describe('runtime fixtures', () => {
    const getMe = { method: 'GET', path: '/me' };
    const listTickets = { method: 'GET', path: '/tickets' };

    it('go to the one connector whose specs have the operation, and list with it', async () => {
      const { runtimeFixtures, fetch, calls } = createCombined();

      expect(runtimeFixtures.set([{ operation: listTickets, response: { status: 503 } }])).toEqual(
        []
      );

      expect((await fetch('https://acme.tenant.example/api/tickets')).status).toBe(503);
      expect(calls[0]).toMatchObject({ connector: 'tenant', responseSource: 'runtime-fixture' });
      expect(runtimeFixtures.list()).toEqual([
        { operation: listTickets, response: { status: 503 }, connector: 'tenant' },
      ]);
      expect(runtimeFixtures.list({ connector: 'outlook' })).toEqual([]);
    });

    it('need the connector when several connectors have the operation', async () => {
      const { runtimeFixtures, fetch } = createCombined();
      const runtime = { operation: getMe, response: { status: 200, body: { name: 'runtime' } } };

      expect(runtimeFixtures.set([runtime])).toEqual([
        {
          source: 'fixture',
          operation: 'GET /me',
          violations: [expect.objectContaining({ code: 'connector' })],
        },
      ]);
      expect(runtimeFixtures.set([runtime], { connector: 'outlook' })).toEqual([]);
      expect(runtimeFixtures.set([{ ...runtime, connector: 'one_drive' }])).toEqual([]);

      const outlook = await fetch(`${GRAPH}/me`, bearer(emulatorCredential('outlook')));
      expect(await outlook.json()).toEqual({ name: 'runtime' });
      expect(runtimeFixtures.list().map(({ connector }) => connector)).toEqual([
        'outlook',
        'one_drive',
      ]);
    });

    it('set none on any connector when one connector rejects a fixture', () => {
      const { runtimeFixtures } = createCombined();
      const earlier = { operation: listTickets, response: { status: 503 } };
      runtimeFixtures.set([earlier]);

      const rejected = runtimeFixtures.set([
        { operation: listTickets, response: { status: 429 } },
        { operation: getMe, connector: 'outlook', response: { status: 200, body: { name: 1 } } },
      ]);

      expect(rejected).toEqual([
        expect.objectContaining({ operation: 'GET /me', connector: 'outlook' }),
      ]);
      expect(runtimeFixtures.list()).toEqual([{ ...earlier, connector: 'tenant' }]);
    });

    it('keep where a sequence is when a later update is rejected', async () => {
      const { runtimeFixtures, fetch } = createCombined();
      const tickets = 'https://acme.tenant.example/api/tickets';
      runtimeFixtures.set([
        { operation: listTickets, responses: [{ status: 503 }, { status: 204 }] },
      ]);
      expect((await fetch(tickets)).status).toBe(503);

      const rejected = runtimeFixtures.set([
        { operation: listTickets, response: { status: 429 } },
        { operation: getMe, connector: 'outlook', response: { status: 200, body: { name: 1 } } },
      ]);

      expect(rejected).toHaveLength(1);
      expect((await fetch(tickets)).status).toBe(204);
    });

    it('reject operations no connector has, and unknown connectors', () => {
      const { runtimeFixtures } = createCombined();

      expect(
        runtimeFixtures
          .set([
            { operation: { method: 'GET', path: '/teams' }, response: { status: 200 } },
            { operation: listTickets, connector: 'zendesk', response: { status: 200 } },
          ])
          .map(({ violations }) => violations[0].code)
      ).toEqual(['operation', 'connector']);
    });

    it('are cleared and reset per connector', () => {
      const { runtimeFixtures, reset } = createCombined();
      runtimeFixtures.set([{ operation: listTickets, response: { status: 503 } }]);
      runtimeFixtures.set([{ operation: getMe, response: { status: 200, body: {} } }], {
        connector: 'outlook',
      });

      runtimeFixtures.clear({ connector: 'tenant' });
      expect(runtimeFixtures.list().map(({ connector }) => connector)).toEqual(['outlook']);

      reset('outlook');
      expect(runtimeFixtures.list()).toEqual([]);
    });
  });

  it('describes an operation of a connector, or of the first that has it', () => {
    const { describeOperation } = createCombined();

    expect(describeOperation('getMe')).toMatchObject({ id: 'getMe', connector: 'outlook' });
    expect(describeOperation('getMe', { connector: 'one_drive' })).toMatchObject({
      connector: 'one_drive',
    });
    expect(describeOperation('getmedrive', { connector: 'outlook' })).toBeUndefined();
  });

  it('refuses connector names a credential cannot carry', () => {
    expect(() =>
      combineEmulators({ '.outlook': createEmulatorFetch({ specs: [tenantSpec] }) })
    ).toThrow('Connector names must be lowercase letters, digits, _ and -');
    expect(() => combineEmulators({})).toThrow('combineEmulators needs at least one emulator');
  });
});
