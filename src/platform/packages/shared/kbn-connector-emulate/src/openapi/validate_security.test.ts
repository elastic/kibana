/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { loadContractOperations } from '.';

const ok = { '200': { description: 'ok' } };

const spec = {
  openapi: '3.0.3',
  info: { title: 'Secured', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  security: [{ apiKey: [] }, { oauth: ['read'] }, { oauth: ['write'] }],
  paths: {
    '/items': { get: { responses: ok } },
    '/both': { get: { security: [{ key: [], token: [] }], responses: ok } },
    '/basic': { get: { security: [{ basic: [] }], responses: ok } },
    '/session': { get: { security: [{ session: [] }], responses: ok } },
    '/public': { get: { security: [], responses: ok } },
    '/optional': { get: { security: [{ apiKey: [] }, {}], responses: ok } },
    '/tls': { get: { security: [{ tls: [] }], responses: ok } },
  },
  components: {
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'X-Api-Key' },
      oauth: {
        type: 'oauth2',
        flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} } },
      },
      key: { type: 'apiKey', in: 'query', name: 'key' },
      token: { type: 'apiKey', in: 'query', name: 'token' },
      basic: { $ref: '#/components/securitySchemes/basicAuth' },
      basicAuth: { type: 'http', scheme: 'basic' },
      session: { type: 'apiKey', in: 'cookie', name: 'sid' },
      tls: { type: 'mutualTLS' },
    },
  },
};

describe('validateSecurity', () => {
  const { fetch, calls } = createEmulatorFetch({ specs: [spec] });
  const statusOf = async (path: string, headers: Record<string, string> = {}) =>
    (await fetch(`https://api.example.com${path}`, { headers })).status;

  afterEach(() => {
    calls.length = 0;
  });

  it('accepts any credential in the place one of the requirements declares', async () => {
    expect(await statusOf('/items', { 'x-api-key': 'anything' })).toBe(200);
    expect(await statusOf('/items', { authorization: 'bearer anything' })).toBe(200);
    expect(await statusOf('/both?key=k&token=t')).toBe(200);
    expect(await statusOf('/basic', { authorization: 'Basic dXNlcjpwYXNz' })).toBe(200);
    expect(await statusOf('/session', { cookie: 'theme=dark; sid=abc' })).toBe(200);
    expect(calls.flatMap(({ requestViolations }) => requestViolations)).toEqual([]);
  });

  it('answers 401 naming the expected credentials when none are present', async () => {
    expect(await statusOf('/items', { authorization: 'Basic dXNlcjpwYXNz' })).toBe(401);
    expect(await statusOf('/both?key=k')).toBe(401);
    expect(await statusOf('/basic', { authorization: 'Basic' })).toBe(401);

    expect(calls.map(({ requestViolations }) => requestViolations[0].message)).toEqual([
      'Request has no credentials for the operation; expected header X-Api-Key, or Authorization: Bearer',
      'Request has no credentials for the operation; expected query parameter key and query parameter token',
      'Request has no credentials for the operation; expected Authorization: Basic',
    ]);
  });

  it('allows anonymous requests where the operation permits them', async () => {
    expect(await statusOf('/public')).toBe(200);
    expect(await statusOf('/optional')).toBe(200);
    expect(await statusOf('/tls')).toBe(200);
  });

  it('converts Swagger 2 security definitions', () => {
    const [operation] = loadContractOperations({
      swagger: '2.0',
      info: { title: 'Legacy', version: '1' },
      host: 'api.example.com',
      security: [{ basic: [] }, { oauth: [] }],
      securityDefinitions: {
        basic: { type: 'basic' },
        oauth: { type: 'oauth2', flow: 'application', tokenUrl: 'https://api.example.com/token' },
      },
      paths: { '/items': { get: { responses: ok } } },
    });

    expect(operation.security).toEqual([
      [{ name: 'basic', credential: { in: 'authorization', scheme: 'basic' } }],
      [{ name: 'oauth', credential: { in: 'authorization', scheme: 'bearer' } }],
    ]);
    expect(operation.spec.document.components).toMatchObject({
      securitySchemes: {
        oauth: {
          type: 'oauth2',
          flows: { clientCredentials: { tokenUrl: 'https://api.example.com/token', scopes: {} } },
        },
      },
    });
  });

  it('keeps the scopes of OAuth 2 requirements only', () => {
    const operations = loadContractOperations(spec);
    const items = operations.find(({ path }) => path === '/items');

    expect(items?.security).toEqual([
      [{ name: 'apiKey', credential: { in: 'header', name: 'X-Api-Key' } }],
      [{ name: 'oauth', credential: { in: 'authorization', scheme: 'bearer' }, scopes: ['read'] }],
      [{ name: 'oauth', credential: { in: 'authorization', scheme: 'bearer' }, scopes: ['write'] }],
    ]);
  });
});

describe('validateSecurity with checkScopes', () => {
  const scoped = {
    openapi: '3.0.3',
    info: { title: 'Scoped', version: '1' },
    servers: [{ url: 'https://api.example.com' }],
    paths: {
      '/read': { get: { security: [{ oauth: ['a'] }], responses: ok } },
      '/write': { post: { security: [{ oauth: ['a', 'b'] }], responses: ok } },
      '/either': {
        get: { security: [{ oauth: ['admin', 'root'] }, { oauth: ['a', 'c'] }], responses: ok },
      },
      '/key-or-oauth': { get: { security: [{ apiKey: [] }, { oauth: ['b'] }], responses: ok } },
    },
    components: {
      securitySchemes: {
        apiKey: { type: 'apiKey', in: 'header', name: 'X-Api-Key' },
        oauth: {
          type: 'oauth2',
          flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: {} } },
        },
      },
    },
  };
  const { fetch, calls } = createEmulatorFetch({ specs: [scoped], checkScopes: true });
  const tokenFor = async (scope?: string) => {
    const response = await fetch('https://auth.example.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'id',
        ...(scope ? { scope } : {}),
      }).toString(),
    });
    return (await response.json()).access_token as string;
  };
  const call = (method: string, path: string, headers: Record<string, string>) =>
    fetch(`https://api.example.com${path}`, { method, headers });

  afterEach(() => {
    calls.length = 0;
  });

  it("answers 403 insufficient_scope naming the operation's scopes when the token lacks some", async () => {
    const token = await tokenFor('a');

    const read = await call('GET', '/read', { authorization: `Bearer ${token}` });
    const write = await call('POST', '/write', { authorization: `Bearer ${token}` });

    expect(read.status).toBe(200);
    expect(write.status).toBe(403);
    expect(write.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="a b"'
    );
    expect((await write.json()).violations).toEqual([
      {
        path: ['security'],
        code: 'insufficient_scope',
        message: 'Token was granted a, but the operation also needs b (requires a b)',
      },
    ]);
    expect(calls.map(({ status }) => status)).toEqual([200, 200, 403]);
  });

  it('accepts a token with every scope of the requirement', async () => {
    const token = await tokenFor('a b');

    expect((await call('POST', '/write', { authorization: `Bearer ${token}` })).status).toBe(200);
  });

  it('accepts any one of several scope sets, and names the closest when none match', async () => {
    const match = await tokenFor('c a');
    const partial = await tokenFor('a');

    const matched = await call('GET', '/either', { authorization: `Bearer ${match}` });
    const forbidden = await call('GET', '/either', { authorization: `Bearer ${partial}` });

    expect(matched.status).toBe(200);
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="a c"'
    );
  });

  it('accepts another satisfied requirement that needs no scopes', async () => {
    const token = await tokenFor('a');

    expect((await call('GET', '/key-or-oauth', { 'x-api-key': 'any' })).status).toBe(200);
    expect((await call('GET', '/key-or-oauth', { authorization: `Bearer ${token}` })).status).toBe(
      403
    );
  });

  it('does not check tokens issued without a scope or not issued by the mock', async () => {
    const unscoped = await tokenFor();

    expect((await call('POST', '/write', { authorization: `Bearer ${unscoped}` })).status).toBe(
      200
    );
    expect((await call('POST', '/write', { authorization: 'Bearer from-config' })).status).toBe(
      200
    );
  });

  it('does not check scopes unless asked to', async () => {
    const lenient = createEmulatorFetch({ specs: [scoped] });
    const response = await lenient.fetch('https://auth.example.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=id&scope=a',
    });
    const { access_token: token } = await response.json();

    const write = await lenient.fetch('https://api.example.com/write', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(write.status).toBe(200);
  });
});
