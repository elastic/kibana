/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { grantedScopes } from './token_endpoints';

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
        access_token: expect.stringMatching(/^contract-mock-access-token\./),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read',
      },
    });
    expect(grantedScopes(token.body.access_token)).toEqual(['read']);

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

  it('keeps the original scopes on refresh unless fewer are requested', async () => {
    const password = await requestToken('https://api.example.com/oauth/token', {
      body: 'grant_type=password&username=user&password=pass&scope=read%20write',
    });
    const refresh = (scope?: string) =>
      requestToken('https://api.example.com/oauth/refresh', {
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: password.body.refresh_token,
          ...(scope ? { scope } : {}),
        }).toString(),
      });

    expect(grantedScopes((await refresh()).body.access_token)).toEqual(['read', 'write']);
    expect(grantedScopes((await refresh('read')).body.access_token)).toEqual(['read']);
  });

  it('keeps the original grant in refresh tokens, and refuses to widen it (RFC 6749 §6)', async () => {
    const password = await requestToken('https://api.example.com/oauth/token', {
      body: 'grant_type=password&username=user&password=pass&scope=read%20write',
    });
    const refresh = (refreshToken: string, scope?: string) =>
      requestToken('https://api.example.com/oauth/refresh', {
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          ...(scope ? { scope } : {}),
        }).toString(),
      });

    const narrowed = await refresh(password.body.refresh_token, 'read');
    const again = await refresh(narrowed.body.refresh_token);
    const widened = await refresh(password.body.refresh_token, 'read delete');

    expect(grantedScopes(again.body.access_token)).toEqual(['read', 'write']);
    expect(widened).toEqual({
      status: 400,
      body: expect.objectContaining({ error: 'invalid_scope' }),
    });
  });

  it('reads no scopes from tokens issued without a scope or not issued by the mock', async () => {
    const { body } = await requestToken('https://auth.example.com/oauth/token', {
      body: 'grant_type=client_credentials&client_id=id',
    });

    expect(body.access_token).toBe('contract-mock-access-token');
    expect(grantedScopes(body.access_token)).toBeUndefined();
    expect(grantedScopes('a-static-token-from-connector-config')).toBeUndefined();
    expect(grantedScopes('contract-mock-access-token.not-base64-json')).toBeUndefined();
  });

  it('accepts client credentials in a Basic header', async () => {
    const { status } = await requestToken('https://auth.example.com/oauth/token', {
      headers: { ...FORM, authorization: 'Basic aWQ6c2VjcmV0' },
      body: 'grant_type=client_credentials',
    });

    expect(status).toBe(200);
  });

  describe('authorization code flow', () => {
    const AUTHORIZE_URL = 'https://auth.example.com/oauth/authorize';
    const TOKEN_URL = 'https://auth.example.com/oauth/token';
    const REDIRECT_URI = 'https://kibana/cb';
    const VERIFIER = 'a-code-verifier-that-is-long-enough-for-rfc-7636-checks';
    const S256_CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');
    const withFlow = {
      ...spec,
      components: {
        securitySchemes: {
          oauth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: AUTHORIZE_URL,
                tokenUrl: TOKEN_URL,
                scopes: {},
              },
            },
          },
        },
      },
    };
    const { fetch: flowFetch, calls: flowCalls } = createEmulatorFetch({ specs: [withFlow] });

    const authorize = async (params: Record<string, string>) => {
      const response = await flowFetch(`${AUTHORIZE_URL}?${new URLSearchParams(params)}`);
      const location = response.headers.get('location');
      return {
        status: response.status,
        location: location ? new URL(location) : undefined,
        body: location ? undefined : await response.json(),
      };
    };
    const VALID = { response_type: 'code', client_id: 'id', redirect_uri: REDIRECT_URI };
    const codeFor = async (params: Record<string, string> = {}) =>
      (await authorize({ ...VALID, ...params })).location?.searchParams.get('code') ?? '';
    const exchange = async (params: Record<string, string>) => {
      const response = await flowFetch(TOKEN_URL, {
        method: 'POST',
        headers: FORM,
        body: new URLSearchParams({ grant_type: 'authorization_code', ...params }).toString(),
      });
      return { status: response.status, body: await response.json() };
    };

    afterEach(() => {
      flowCalls.length = 0;
    });

    it('redirects back with a code and the unchanged state', async () => {
      const { status, location } = await authorize({ ...VALID, state: 's p/a+c=e' });

      expect(status).toBe(302);
      expect(`${location?.origin}${location?.pathname}`).toBe(REDIRECT_URI);
      expect(location?.searchParams.get('code')).toEqual(expect.any(String));
      expect(location?.searchParams.get('state')).toBe('s p/a+c=e');
      expect(flowCalls).toEqual([
        expect.objectContaining({ operation: 'OAuth authorization', token: true, status: 302 }),
      ]);
    });

    it('keeps the query of the redirect URI', async () => {
      const { location } = await authorize({ ...VALID, redirect_uri: `${REDIRECT_URI}?a=1` });

      expect(location?.searchParams.get('a')).toBe('1');
      expect(location?.searchParams.has('code')).toBe(true);
    });

    it('exchanges the code for tokens carrying the requested scopes', async () => {
      const code = await codeFor({ scope: 'read write' });

      const { status, body } = await exchange({ code, redirect_uri: REDIRECT_URI });

      expect(status).toBe(200);
      expect(body.scope).toBe('read write');
      expect(grantedScopes(body.access_token)).toEqual(['read', 'write']);
      expect(body.refresh_token).toEqual(expect.stringMatching(/^contract-mock-refresh-token\./));
    });

    it('still accepts codes the mock did not issue', async () => {
      expect((await exchange({ code: 'from-a-recording' })).status).toBe(200);
    });

    it("rejects a redirect_uri that doesn't match the authorization request", async () => {
      const code = await codeFor();

      const wrong = await exchange({ code, redirect_uri: 'https://elsewhere/cb' });
      const missing = await exchange({ code });

      expect(wrong).toEqual({
        status: 400,
        body: expect.objectContaining({ error: 'invalid_grant' }),
      });
      expect(missing.body.error).toBe('invalid_grant');
    });

    it.each([
      ['S256', S256_CHALLENGE, 'S256', VERIFIER],
      ['plain', VERIFIER, 'plain', VERIFIER],
      ['plain by default', VERIFIER, undefined, VERIFIER],
    ])('verifies code_verifier with %s PKCE', async (_, challenge, method, verifier) => {
      const code = await codeFor({
        code_challenge: challenge,
        ...(method ? { code_challenge_method: method } : {}),
      });
      const tokenRequest = { code, redirect_uri: REDIRECT_URI };

      const right = await exchange({ ...tokenRequest, code_verifier: verifier });
      const wrong = await exchange({ ...tokenRequest, code_verifier: `${verifier}-wrong` });
      const missing = await exchange(tokenRequest);

      expect(right.status).toBe(200);
      expect(wrong).toEqual({
        status: 400,
        body: expect.objectContaining({ error: 'invalid_grant' }),
      });
      expect(missing.body.error).toBe('invalid_grant');
    });

    it.each([
      ['an empty response_type', { response_type: '' }, 'unsupported_response_type'],
      ['another response_type', { response_type: 'token' }, 'unsupported_response_type'],
      ['an unknown PKCE method', { code_challenge: VERIFIER, code_challenge_method: 'S512' }],
      ['a PKCE method without a challenge', { code_challenge_method: 'S256' }],
      ['a short code_challenge', { code_challenge: 'short' }],
    ])('redirects back with the error for %s', async (_, params, error = 'invalid_request') => {
      const { status, location } = await authorize({ ...VALID, state: 's', ...params });

      expect(status).toBe(302);
      expect(location?.searchParams.get('error')).toBe(error);
      expect(location?.searchParams.get('state')).toBe('s');
      expect(location?.searchParams.has('code')).toBe(false);
      expect(flowCalls[0].requestViolations).toEqual([expect.objectContaining({ code: error })]);
    });

    it('reports a response_type that is left out', async () => {
      const { location } = await authorize({ client_id: 'id', redirect_uri: REDIRECT_URI });

      expect(location?.searchParams.get('error')).toBe('invalid_request');
    });

    it.each([
      ['a missing redirect_uri', { response_type: 'code', client_id: 'id' }],
      ['a relative redirect_uri', { ...VALID, redirect_uri: '/cb' }],
      ['a redirect_uri with a fragment', { ...VALID, redirect_uri: `${REDIRECT_URI}#f` }],
      ['a missing client_id', { response_type: 'code', redirect_uri: REDIRECT_URI }],
    ])('answers 400 instead of redirecting for %s', async (_, params) => {
      const { status, location, body } = await authorize(params);

      expect(status).toBe(400);
      expect(location).toBeUndefined();
      expect(body.error).toBe('invalid_request');
    });

    it("doesn't serve Google's authorization URL for other vendors' specs", async () => {
      const response = await flowFetch(
        `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(VALID)}`
      );

      expect(response.status).toBe(404);
    });

    it('only serves GET at the authorization URL', async () => {
      const response = await flowFetch(`${AUTHORIZE_URL}?${new URLSearchParams(VALID)}`, {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });

    it('resolves relative authorization URLs against the server', async () => {
      const relative = {
        ...spec,
        components: {
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: '/oauth/authorize',
                  tokenUrl: '/oauth/token',
                  scopes: {},
                },
              },
            },
          },
        },
      };
      const { fetch: relativeFetch } = createEmulatorFetch({ specs: [relative] });

      const response = await relativeFetch(
        `https://api.example.com/oauth/authorize?${new URLSearchParams(VALID)}`
      );

      expect(response.status).toBe(302);
    });

    it("serves Google's current authorization URL for the committed Gmail snapshot", async () => {
      const gmail = JSON.parse(
        readFileSync(
          resolve(
            __dirname,
            '../../../kbn-connector-specs/src/specs/gmail/vendor_api/snapshots/v1.openapi.json'
          ),
          'utf8'
        )
      );
      const { fetch: gmailFetch } = createEmulatorFetch({ specs: [gmail] });

      const response = await gmailFetch(
        `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(VALID)}`
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toMatch(/^https:\/\/kibana\/cb\?code=/);
    });

    it('serves an authorization URL a spec declares as the v2 URL, not only the alias', async () => {
      const v2Url = 'https://accounts.google.com/o/oauth2/v2/auth';
      const declared = {
        ...withFlow,
        components: {
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              flows: {
                authorizationCode: { authorizationUrl: v2Url, tokenUrl: TOKEN_URL, scopes: {} },
              },
            },
          },
        },
      };
      const { fetch: declaredFetch } = createEmulatorFetch({ specs: [declared] });

      const response = await declaredFetch(`${v2Url}?${new URLSearchParams(VALID)}`);

      expect(response.status).toBe(302);
    });

    it('rejects a code_verifier that is not 43 to 128 unreserved characters', async () => {
      const short = 'short';
      const code = await codeFor({
        code_challenge: createHash('sha256').update(short).digest('base64url'),
        code_challenge_method: 'S256',
      });

      const response = await exchange({
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: short,
      });

      expect(response).toEqual({
        status: 400,
        body: expect.objectContaining({
          error: 'invalid_grant',
          error_description: 'code_verifier must be 43 to 128 unreserved characters',
        }),
      });
    });

    it('throws on authorization URLs that cannot be parsed', () => {
      const invalid = {
        ...spec,
        components: {
          securitySchemes: {
            oauth: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://exa mple.com/a',
                  tokenUrl: TOKEN_URL,
                  scopes: {},
                },
              },
            },
          },
        },
      };

      expect(() => createEmulatorFetch({ specs: [invalid] })).toThrow(
        'The authorizationUrl of the authorizationCode flow of security scheme oauth "https://exa mple.com/a" is not a valid URL'
      );
    });
  });

  describe('JWT bearer assertions', () => {
    const assertion = (claims: Record<string, unknown>) =>
      `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
    const exchange = (jwt: string, scope?: string) =>
      requestToken('https://auth.example.com/oauth/token', {
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
          ...(scope ? { scope } : {}),
        }).toString(),
      });

    it('issues an access token for the scopes the assertion claims', async () => {
      const { status, body } = await exchange(assertion({ scope: 'read write' }));

      expect({ status, body }).toEqual({
        status: 200,
        body: {
          access_token: expect.stringMatching(/^contract-mock-access-token\./),
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });
      expect(grantedScopes(body.access_token)).toEqual(['read', 'write']);
    });

    it('reads the scopes from the request when the assertion claims none (RFC 7523)', async () => {
      const { body } = await exchange(assertion({ iss: 'service-account' }), 'read');

      expect(grantedScopes(body.access_token)).toEqual(['read']);
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
