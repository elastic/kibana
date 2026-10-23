/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';

const spec = {
  openapi: '3.0.3',
  info: { title: 'OAuth', version: '1' },
  servers: [{ url: 'https://api.example.com/v1' }],
  security: [{ oauth: [] }],
  paths: { '/items': { get: { responses: { '200': { description: 'ok' } } } } },
  components: {
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        flows: {
          clientCredentials: { tokenUrl: 'https://auth.example.com/oauth/token', scopes: {} },
          password: { tokenUrl: '/oauth/token', refreshUrl: '/oauth/refresh', scopes: {} },
        },
      },
    },
  },
};

const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

describe('token endpoints', () => {
  const { fetch, calls } = createEmulatorFetch({ specs: [spec] });
  const requestToken = async (url: string, init: RequestInit) => {
    const response = await fetch(url, { method: 'POST', headers: FORM, ...init });
    return { status: response.status, body: await response.json() };
  };

  afterEach(() => {
    calls.length = 0;
  });

  it('issues a bearer token the mock then accepts', async () => {
    const token = await requestToken('https://auth.example.com/oauth/token', {
      body: 'grant_type=client_credentials&client_id=id&client_secret=secret&scope=read',
    });

    expect(token).toEqual({
      status: 200,
      body: {
        access_token: 'contract-mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read',
      },
    });

    const items = await fetch('https://api.example.com/v1/items', {
      headers: { authorization: `Bearer ${token.body.access_token}` },
    });
    expect(items.status).toBe(200);
    expect(calls.map(({ operation, status }) => [operation, status])).toEqual([
      ['OAuth token', 200],
      ['GET /items', 200],
    ]);
  });

  it('resolves relative token and refresh URLs against the server', async () => {
    const password = await requestToken('https://api.example.com/oauth/token', {
      body: 'grant_type=password&username=user&password=pass',
    });
    const refresh = await requestToken('https://api.example.com/oauth/refresh', {
      body: 'grant_type=refresh_token&refresh_token=contract-mock-refresh-token',
    });

    expect(password.body.refresh_token).toBe('contract-mock-refresh-token');
    expect(refresh.status).toBe(200);
  });

  it.each([
    ['a JSON body', { headers: { 'content-type': 'application/json' }, body: '{}' }, 400],
    ['an undeclared grant', { body: 'grant_type=authorization_code&code=c' }, 400],
    ['a missing grant parameter', { body: 'grant_type=password&username=user' }, 400],
    ['missing client credentials', { body: 'grant_type=client_credentials' }, 401],
  ])('rejects %s like an authorization server', async (_, init, status) => {
    const { status: actual, body } = await requestToken(
      'https://auth.example.com/oauth/token',
      init
    );

    expect(actual).toBe(status);
    expect(body.error).toEqual(expect.any(String));
    expect(calls[0].requestViolations).toEqual([
      expect.objectContaining({ code: body.error, message: body.error_description }),
    ]);
  });

  it('accepts client credentials in a Basic header', async () => {
    const { status } = await requestToken('https://auth.example.com/oauth/token', {
      headers: { ...FORM, authorization: 'Basic aWQ6c2VjcmV0' },
      body: 'grant_type=client_credentials',
    });

    expect(status).toBe(200);
  });

  describe('JWT bearer assertions', () => {
    const assertion = (claims: Record<string, unknown>) =>
      `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
    const exchange = (jwt: string) =>
      requestToken('https://auth.example.com/oauth/token', {
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }).toString(),
      });

    it('issues an access token for a scope', async () => {
      expect(await exchange(assertion({ scope: 'read' }))).toEqual({
        status: 200,
        body: {
          access_token: 'contract-mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });
    });

    it('issues an ID token for a target audience', async () => {
      expect(await exchange(assertion({ target_audience: 'https://fn.example.com' }))).toEqual({
        status: 200,
        body: { id_token: 'contract-mock-id-token', expires_in: 3600 },
      });
    });

    it('rejects an assertion that is not a JWT', async () => {
      expect((await exchange('not-a-jwt')).body.error).toBe('invalid_grant');
    });
  });

  describe('servers', () => {
    const withServers = (servers: unknown[], tokenUrl: string) => ({
      ...spec,
      servers,
      components: {
        securitySchemes: {
          oauth: { type: 'oauth2', flows: { clientCredentials: { tokenUrl, scopes: {} } } },
        },
      },
    });
    const statusOf = async (mockFetch: typeof fetch, url: string) =>
      (
        await mockFetch(url, {
          method: 'POST',
          headers: FORM,
          body: 'grant_type=client_credentials&client_id=id',
        })
      ).status;

    it('resolves relative token URLs against templated servers', async () => {
      const zendesk = withServers(
        [
          {
            url: 'https://{subdomain}.zendesk.com/api/v2',
            variables: { subdomain: { default: 'example' } },
          },
        ],
        '/oauth/tokens'
      );
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [zendesk] });

      expect(await statusOf(mockFetch, 'https://acme.zendesk.com/oauth/tokens')).toBe(200);
      expect(await statusOf(mockFetch, 'https://acme.zendesk.com/api/v2/oauth/tokens')).toBe(404);
    });

    it('resolves relative token URLs against every server', async () => {
      const staged = withServers(
        [{ url: 'https://api.example.com/v1' }, { url: 'https://staging.example.com/v1' }],
        '/oauth/token'
      );
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [staged] });

      expect(await statusOf(mockFetch, 'https://api.example.com/oauth/token')).toBe(200);
      expect(await statusOf(mockFetch, 'https://staging.example.com/oauth/token')).toBe(200);
    });

    it('keeps absolute token URLs of specs with relative servers', async () => {
      const relative = withServers([{ url: '/v1' }], 'https://auth.example.com/oauth/token');
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [relative] });

      expect(await statusOf(mockFetch, 'https://auth.example.com/oauth/token')).toBe(200);
    });

    it('matches relative token URLs of relative servers on any host', async () => {
      const relative = withServers([{ url: '/v1' }], 'oauth/token');
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [relative] });

      expect(await statusOf(mockFetch, 'https://anywhere.example.com/oauth/token')).toBe(200);
    });

    it('resolves token URLs against servers with a port variable', async () => {
      const ported = withServers(
        [{ url: 'https://api.example.com:{port}/v1', variables: { port: { default: '8443' } } }],
        '/oauth/token'
      );
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [ported] });

      expect(await statusOf(mockFetch, 'https://api.example.com:8443/oauth/token')).toBe(200);
    });

    it('matches hosts but not paths case-insensitively', async () => {
      const mixedCase = withServers(
        [{ url: 'https://API.example.com/v1' }],
        'https://Auth.example.com/OAuth/Token'
      );
      const { fetch: mockFetch } = createEmulatorFetch({ specs: [mixedCase] });

      expect(await statusOf(mockFetch, 'https://auth.example.com/OAuth/Token')).toBe(200);
      expect(await statusOf(mockFetch, 'https://auth.example.com/oauth/token')).toBe(404);
    });

    it('throws on token URLs that cannot be parsed', () => {
      const invalid = withServers([{ url: 'https://api.example.com' }], 'https://exa mple.com/t');

      expect(() => createEmulatorFetch({ specs: [invalid] })).toThrow(
        'The tokenUrl of the clientCredentials flow of security scheme oauth "https://exa mple.com/t" is not a valid URL'
      );
    });
  });
});
