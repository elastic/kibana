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

  it('does not take a longer name for a shorter one', async () => {
    const { fetch, calls } = combineEmulators({
      sharepoint: createEmulatorFetch({ specs: [graphSpec('/sites')] }),
      'sharepoint-online': createEmulatorFetch({ specs: [graphSpec('/drives')] }),
    });

    await fetch(`${GRAPH}/me`, bearer(emulatorCredential('sharepoint-online')));
    await fetch(`${GRAPH}/me`, bearer('emulate-sharepoint-other'));

    expect(calls.map(({ connector }) => connector)).toEqual(['sharepoint-online', 'sharepoint']);
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

  it('refuses connector names a credential cannot carry', () => {
    expect(() =>
      combineEmulators({ '.outlook': createEmulatorFetch({ specs: [tenantSpec] }) })
    ).toThrow('Connector names must be lowercase letters, digits, _ and -');
    expect(() => combineEmulators({})).toThrow('combineEmulators needs at least one emulator');
  });
});
