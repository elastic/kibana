/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { issueAccessToken } from './token_endpoints';
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
      '/write': { post: { security: [{ oauth: ['b', 'c'] }], responses: ok } },
      '/either': {
        get: { security: [{ oauth: ['admin', 'root'] }, { oauth: ['c', 'd'] }], responses: ok },
      },
      '/both': {
        get: { security: [{ oauth: ['b', 'c'], other: ['d'] }], responses: ok },
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
        other: {
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

  it("answers 403 insufficient_scope naming the operation's scopes when the token has none of them", async () => {
    const token = await tokenFor('a');

    const read = await call('GET', '/read', { authorization: `Bearer ${token}` });
    const write = await call('POST', '/write', { authorization: `Bearer ${token}` });

    expect(read.status).toBe(200);
    expect(write.status).toBe(403);
    expect(write.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="b c"'
    );
    expect((await write.json()).violations).toEqual([
      {
        path: ['security'],
        code: 'insufficient_scope',
        message: 'Token was granted a, but the operation needs one of b c',
      },
    ]);
    expect(calls.map(({ status }) => status)).toEqual([200, 200, 403]);
  });

  it("reads a scheme's scopes as alternatives, as vendors list them", async () => {
    const token = await tokenFor('c');

    expect((await call('POST', '/write', { authorization: `Bearer ${token}` })).status).toBe(200);
  });

  it('needs a scope of every scheme of the requirement', async () => {
    const oneScheme = await tokenFor('b');
    const both = await tokenFor('b d');

    const forbidden = await call('GET', '/both', { authorization: `Bearer ${oneScheme}` });

    expect(forbidden.status).toBe(403);
    expect((await forbidden.json()).violations[0].message).toBe(
      'Token was granted b, but the operation needs one of d'
    );
    expect((await call('GET', '/both', { authorization: `Bearer ${both}` })).status).toBe(200);
  });

  it('accepts any one of several requirements, and names the first when none is met', async () => {
    const match = await tokenFor('d');
    const other = await tokenFor('x');

    const matched = await call('GET', '/either', { authorization: `Bearer ${match}` });
    const forbidden = await call('GET', '/either', { authorization: `Bearer ${other}` });

    expect(matched.status).toBe(200);
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers.get('www-authenticate')).toBe(
      'Bearer error="insufficient_scope", scope="admin root"'
    );
  });

  it('accepts another satisfied requirement that needs no scopes', async () => {
    const token = await tokenFor('a');

    expect((await call('GET', '/key-or-oauth', { 'x-api-key': 'any' })).status).toBe(200);
    expect((await call('GET', '/key-or-oauth', { authorization: `Bearer ${token}` })).status).toBe(
      403
    );
  });

  it('does not check tokens issued without a scope, for a .default scope, or not by the mock', async () => {
    const unscoped = await tokenFor();
    const appDefault = await tokenFor('https://api.example.com/.default');

    expect((await call('POST', '/write', { authorization: `Bearer ${unscoped}` })).status).toBe(
      200
    );
    expect((await call('POST', '/write', { authorization: `Bearer ${appDefault}` })).status).toBe(
      200
    );
    expect(issueAccessToken('https://api.example.com/.default')).toBe(issueAccessToken());
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

  it('answers as usual with checkScopes report, listing the missing scopes on the call', async () => {
    const reporting = createEmulatorFetch({ specs: [scoped], checkScopes: 'report' });
    const token = issueAccessToken('a');

    const write = await reporting.fetch('https://api.example.com/write', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    const read = await reporting.fetch('https://api.example.com/read', {
      headers: { authorization: `Bearer ${token}` },
    });

    expect([write.status, read.status]).toEqual([200, 200]);
    expect(reporting.calls.map(({ requestViolations }) => requestViolations)).toEqual([[], []]);
    expect(reporting.calls.map(({ scopeViolations }) => scopeViolations)).toEqual([
      [
        {
          path: ['security'],
          code: 'insufficient_scope',
          message: 'Token was granted a, but the operation needs one of b c',
        },
      ],
      undefined,
    ]);
  });

  it('issues tokens for a scope as the token URLs do', async () => {
    expect(issueAccessToken('a b')).toBe(await tokenFor('a b'));
    expect(issueAccessToken()).toBe(await tokenFor());
  });
});
