/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContractMockFetch } from '../fetch/create_contract_mock_fetch';
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
  const { fetch, calls } = createContractMockFetch({ specs: [spec] });
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
});
