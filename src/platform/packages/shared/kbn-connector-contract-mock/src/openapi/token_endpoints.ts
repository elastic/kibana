/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest, ContractResponse } from '../contract/types';
import { isRecord } from './schema_walk';
import type { ContractOperation } from './types';

// The mock accepts any token, so the issued ones are fixed.
const ACCESS_TOKEN = 'contract-mock-access-token';
const REFRESH_TOKEN = 'contract-mock-refresh-token';
const ID_TOKEN = 'contract-mock-id-token';

// RFC 7523, which service accounts (e.g. Google's) use to trade a signed JWT for a token.
const JWT_BEARER = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

// The grant types each OAuth 2 flow uses at its token URL, and the parameters they require.
const FLOW_GRANTS: Readonly<Record<string, string>> = {
  clientCredentials: 'client_credentials',
  password: 'password',
  authorizationCode: 'authorization_code',
};
const GRANT_PARAMETERS: Readonly<Record<string, readonly string[]>> = {
  client_credentials: [],
  password: ['username', 'password'],
  authorization_code: ['code'],
  refresh_token: ['refresh_token'],
  [JWT_BEARER]: ['assertion'],
};

/** Grant types accepted per token URL, without query string. */
export type TokenEndpoints = ReadonlyMap<string, ReadonlySet<string>>;

const toEndpoint = (url: unknown, base: string): string | undefined => {
  if (typeof url !== 'string') {
    return undefined;
  }
  try {
    const { origin, pathname } = new URL(url, base);
    return `${origin}${pathname}`;
  } catch {
    return undefined;
  }
};

/** Collects the token and refresh URLs of the OAuth 2 flows declared by the operations' specs. */
export const findTokenEndpoints = (operations: readonly ContractOperation[]): TokenEndpoints => {
  const endpoints = new Map<string, Set<string>>();
  const add = (url: string | undefined, grant: string) => {
    if (url) {
      endpoints.set(url, new Set([...(endpoints.get(url) ?? []), grant]));
    }
  };
  const specs = new Map(operations.map((operation) => [operation.spec.document, operation]));
  for (const [document, { servers }] of specs) {
    // Relative token URLs resolve against the API's server.
    const base = servers[0]?.url ?? 'https://localhost/';
    const { securitySchemes } = isRecord(document.components) ? document.components : {};
    for (const scheme of Object.values(isRecord(securitySchemes) ? securitySchemes : {})) {
      if (!isRecord(scheme) || scheme.type !== 'oauth2' || !isRecord(scheme.flows)) {
        continue;
      }
      for (const [flow, settings] of Object.entries(scheme.flows)) {
        if (!isRecord(settings)) {
          continue;
        }
        if (flow in FLOW_GRANTS) {
          add(toEndpoint(settings.tokenUrl, base), FLOW_GRANTS[flow]);
          // OpenAPI has no flow for it, but token URLs commonly accept it too.
          add(toEndpoint(settings.tokenUrl, base), JWT_BEARER);
        }
        add(toEndpoint(settings.refreshUrl ?? settings.tokenUrl, base), 'refresh_token');
      }
    }
  }
  return endpoints;
};

const oauthError = (statusCode: number, error: string, description: string): ContractResponse => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: { error, error_description: description },
});

const hasClientCredentials = (form: URLSearchParams, authorization: string | undefined) =>
  form.has('client_id') || /^basic\s+\S/i.test(authorization ?? '');

const jwtClaims = (jwt: string): Record<string, unknown> | undefined => {
  const [, payload] = jwt.split('.');
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8'));
    return isRecord(claims) ? claims : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Answers a request to a token URL as an OAuth 2 authorization server would (RFC 6749): a
 * form-encoded POST with a grant type of a declared flow and the parameters it requires gets
 * a bearer token. Credentials are not checked.
 */
export const respondToTokenRequest = (
  grants: ReadonlySet<string>,
  { method, headers, body }: ContractRequest
): ContractResponse => {
  if (method !== 'post') {
    return oauthError(405, 'invalid_request', 'Token requests must use POST');
  }
  if (!/^application\/x-www-form-urlencoded/i.test(headers['content-type'] ?? '')) {
    return oauthError(
      400,
      'invalid_request',
      'Token requests must be sent as application/x-www-form-urlencoded'
    );
  }
  const form = new URLSearchParams(typeof body === 'string' ? body : '');
  const grant = form.get('grant_type') ?? '';
  if (!grants.has(grant)) {
    const accepted = [...grants].join(', ');
    return oauthError(400, 'unsupported_grant_type', `Expected grant_type ${accepted}`);
  }
  const missing = (GRANT_PARAMETERS[grant] ?? []).filter((name) => !form.get(name));
  if (missing.length > 0) {
    return oauthError(400, 'invalid_request', `Missing ${missing.join(', ')}`);
  }
  if (grant === 'client_credentials' && !hasClientCredentials(form, headers.authorization)) {
    return oauthError(401, 'invalid_client', 'Expected client_id or Basic client authentication');
  }
  if (grant === JWT_BEARER) {
    const claims = jwtClaims(form.get('assertion') ?? '');
    if (!claims) {
      return oauthError(400, 'invalid_grant', 'The assertion is not a JWT');
    }
    // Google issues an ID token instead when the assertion asks for one.
    const issued =
      typeof claims.target_audience === 'string'
        ? { id_token: ID_TOKEN }
        : { access_token: ACCESS_TOKEN, token_type: 'Bearer' };
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: { ...issued, expires_in: 3600 },
    };
  }
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: {
      access_token: ACCESS_TOKEN,
      token_type: 'Bearer',
      expires_in: 3600,
      ...(grant === 'client_credentials' ? {} : { refresh_token: REFRESH_TOKEN }),
      ...(form.get('scope') ? { scope: form.get('scope') } : {}),
    },
  };
};
