/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest, ContractResponse } from '../contract/types';
import { compileUrlMatcher } from './match_operation';
import { isRecord } from './schema_walk';
import type { ContractOperation, OpenApiDocument, OperationServer, Violation } from './types';

// The mock accepts any token, so the issued ones are fixed, apart from the scopes they carry.
const ACCESS_TOKEN = 'contract-mock-access-token';
const REFRESH_TOKEN = 'contract-mock-refresh-token';
const ID_TOKEN = 'contract-mock-id-token';

/** Space-delimited scopes, as OAuth 2 requests and JWT claims carry them (RFC 6749 §3.3). */
const parseScopes = (value: unknown): string[] =>
  typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : [];

// Tokens granted specific scopes carry them, base64url-encoded, so scope checks can read them.
const withScopes = (token: string, scopes: readonly string[]): string =>
  scopes.length === 0
    ? token
    : `${token}.${Buffer.from(JSON.stringify(scopes)).toString('base64url')}`;

const scopesOf = (token: string, prefix: string): string[] | undefined => {
  if (!token.startsWith(`${prefix}.`)) {
    return undefined;
  }
  try {
    const scopes: unknown = JSON.parse(
      Buffer.from(token.slice(prefix.length + 1), 'base64url').toString('utf8')
    );
    return Array.isArray(scopes) && scopes.every((scope) => typeof scope === 'string')
      ? scopes
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The scopes an access token issued by the mock was granted; undefined for tokens the mock
 * didn't issue (e.g. static bearer tokens from connector config) and tokens issued without a
 * scope, which get the vendor's default scopes.
 */
export const grantedScopes = (token: string): readonly string[] | undefined =>
  scopesOf(token, ACCESS_TOKEN);

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

/** Grant types accepted at the token URLs a request URL matches, if any. */
export type TokenEndpoints = (url: URL) => ReadonlySet<string> | undefined;

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i;
const ORIGIN = /^([a-z][a-z\d+.-]*:\/\/[^/?#]*)(.*)$/i;
const TEMPLATE_VARIABLE = /\{[^}]+\}/g;
// OpenAPI's default when a spec declares no servers.
const DEFAULT_SERVER: OperationServer = { url: '/', variables: {} };

const withoutQuery = (url: string): string => url.replace(/[?#].*$/, '');

// RFC 3986 section 5.2.4.
const removeDotSegments = (path: string): string => {
  const output: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '..') {
      if (output.length > 1) {
        output.pop();
      }
    } else if (segment !== '.') {
      output.push(segment);
    }
  }
  return output.join('/');
};

// Resolves a token URL against a server as a URL reference (RFC 3986) on the templates
// themselves, since `URL` rejects or mangles variables such as `{subdomain}` or `{port}`. Throws
// when the token URL isn't a URL, checked with each variable as `0`, which any component accepts.
const resolveTokenUrl = (
  url: string,
  { url: base, variables }: OperationServer
): OperationServer => {
  new URL(url.replace(TEMPLATE_VARIABLE, '0'), 'https://relative.invalid');
  if (ABSOLUTE_URL.test(url)) {
    return { url: withoutQuery(url), variables };
  }
  // Relative servers such as `/v1` have no origin, and their token URLs match on the path only.
  const [, origin = '', basePath = base] = ORIGIN.exec(base) ?? [];
  if (url.startsWith('//')) {
    const [scheme = 'https'] = origin.split(':');
    return { url: withoutQuery(`${scheme}:${url}`), variables };
  }
  const path = url.startsWith('/')
    ? url
    : `${withoutQuery(basePath || '/').replace(/[^/]*$/, '')}${url}`;
  return { url: `${origin}${removeDotSegments(withoutQuery(path))}`, variables };
};

const uniqueServers = (operations: readonly ContractOperation[]): OperationServer[] => {
  const servers = operations.flatMap(({ servers: declared }) =>
    declared.length > 0 ? declared : [DEFAULT_SERVER]
  );
  return [...new Map(servers.map((server) => [JSON.stringify(server), server])).values()];
};

/**
 * Collects the token and refresh URLs of the OAuth 2 flows declared by the operations' specs.
 * Relative ones resolve against every server of the spec. Throws on URLs that can't be parsed.
 */
export const findTokenEndpoints = (operations: readonly ContractOperation[]): TokenEndpoints => {
  const endpoints = new Map<string, { matches: (url: URL) => boolean; grants: Set<string> }>();
  const operationsBySpec = new Map<OpenApiDocument, ContractOperation[]>();
  for (const operation of operations) {
    const { document } = operation.spec;
    const specOperations = operationsBySpec.get(document);
    if (specOperations) {
      specOperations.push(operation);
    } else {
      operationsBySpec.set(document, [operation]);
    }
  }
  for (const [document, specOperations] of operationsBySpec) {
    const servers = uniqueServers(specOperations);
    const add = (url: unknown, grant: string, describe: () => string) => {
      if (typeof url !== 'string') {
        return;
      }
      for (const server of servers) {
        let endpoint: OperationServer;
        try {
          endpoint = resolveTokenUrl(url, server);
        } catch {
          throw new Error(`${describe()} ${JSON.stringify(url)} is not a valid URL`);
        }
        const key = JSON.stringify(endpoint);
        const existing = endpoints.get(key);
        if (existing) {
          existing.grants.add(grant);
        } else {
          endpoints.set(key, { matches: compileUrlMatcher(endpoint), grants: new Set([grant]) });
        }
      }
    };
    const { securitySchemes } = isRecord(document.components) ? document.components : {};
    for (const [name, scheme] of Object.entries(isRecord(securitySchemes) ? securitySchemes : {})) {
      if (!isRecord(scheme) || scheme.type !== 'oauth2' || !isRecord(scheme.flows)) {
        continue;
      }
      for (const [flow, settings] of Object.entries(scheme.flows)) {
        if (!isRecord(settings)) {
          continue;
        }
        const describe = (field: string) => () =>
          `The ${field} of the ${flow} flow of security scheme ${name}`;
        if (flow in FLOW_GRANTS) {
          add(settings.tokenUrl, FLOW_GRANTS[flow], describe('tokenUrl'));
          // OpenAPI has no flow for it, but token URLs commonly accept it too.
          add(settings.tokenUrl, JWT_BEARER, describe('tokenUrl'));
        }
        const refreshField = settings.refreshUrl === undefined ? 'tokenUrl' : 'refreshUrl';
        add(settings[refreshField], 'refresh_token', describe(refreshField));
      }
    }
  }
  const list = [...endpoints.values()];
  return (url) => {
    const grants = list
      .filter(({ matches }) => matches(url))
      .flatMap(({ grants: set }) => [...set]);
    return grants.length > 0 ? new Set(grants) : undefined;
  };
};

/** A token URL's response, with the OAuth error of a rejected request as a violation. */
export interface TokenExchange {
  readonly response: ContractResponse;
  readonly violations: readonly Violation[];
}

const oauthError = (
  statusCode: number,
  error: string,
  description: string,
  path: readonly string[]
): TokenExchange => ({
  response: {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: { error, error_description: description },
  },
  violations: [{ path, code: error, message: description }],
});

const issued = (body: Record<string, unknown>): TokenExchange => ({
  response: {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body,
  },
  violations: [],
});

// RFC 6749 §6: a refresh may ask for fewer scopes than the original grant, never more, and the
// new refresh token keeps the original grant. Refresh tokens the mock didn't issue for specific
// scopes (`grant` undefined) aren't checked.
const refresh = (grant: string[] | undefined, requested: string[]): TokenExchange => {
  const added = grant ? requested.filter((scope) => !grant.includes(scope)) : [];
  if (added.length > 0) {
    return oauthError(400, 'invalid_scope', `The refresh token wasn't granted ${added.join(' ')}`, [
      'body',
      'scope',
    ]);
  }
  const scopes = requested.length > 0 ? requested : grant ?? [];
  return issued({
    access_token: withScopes(ACCESS_TOKEN, scopes),
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: withScopes(REFRESH_TOKEN, grant ?? []),
    ...(scopes.length > 0 ? { scope: scopes.join(' ') } : {}),
  });
};

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
): TokenExchange => {
  if (method !== 'post') {
    return oauthError(405, 'invalid_request', 'Token requests must use POST', ['method']);
  }
  if (!/^application\/x-www-form-urlencoded/i.test(headers['content-type'] ?? '')) {
    return oauthError(
      400,
      'invalid_request',
      'Token requests must be sent as application/x-www-form-urlencoded',
      ['header', 'content-type']
    );
  }
  const form = new URLSearchParams(typeof body === 'string' ? body : '');
  const grant = form.get('grant_type') ?? '';
  if (!grants.has(grant)) {
    const accepted = [...grants].join(', ');
    return oauthError(400, 'unsupported_grant_type', `Expected grant_type ${accepted}`, [
      'body',
      'grant_type',
    ]);
  }
  const missing = (GRANT_PARAMETERS[grant] ?? []).filter((name) => !form.get(name));
  if (missing.length > 0) {
    return oauthError(400, 'invalid_request', `Missing ${missing.join(', ')}`, [
      'body',
      missing[0],
    ]);
  }
  if (grant === 'client_credentials' && !hasClientCredentials(form, headers.authorization)) {
    return oauthError(401, 'invalid_client', 'Expected client_id or Basic client authentication', [
      'security',
    ]);
  }
  if (grant === JWT_BEARER) {
    const claims = jwtClaims(form.get('assertion') ?? '');
    if (!claims) {
      return oauthError(400, 'invalid_grant', 'The assertion is not a JWT', ['body', 'assertion']);
    }
    // Google issues an ID token instead when the assertion asks for one. Google puts the scopes
    // in the assertion's claims; RFC 7523 also allows them as the request's `scope`.
    const claimed = parseScopes(claims.scope);
    const scopes = claimed.length > 0 ? claimed : parseScopes(form.get('scope'));
    const token =
      typeof claims.target_audience === 'string'
        ? { id_token: ID_TOKEN }
        : { access_token: withScopes(ACCESS_TOKEN, scopes), token_type: 'Bearer' };
    return issued({ ...token, expires_in: 3600 });
  }
  const requested = parseScopes(form.get('scope'));
  if (grant === 'refresh_token') {
    return refresh(scopesOf(form.get('refresh_token') ?? '', REFRESH_TOKEN), requested);
  }
  return issued({
    access_token: withScopes(ACCESS_TOKEN, requested),
    token_type: 'Bearer',
    expires_in: 3600,
    ...(grant === 'client_credentials'
      ? {}
      : { refresh_token: withScopes(REFRESH_TOKEN, requested) }),
    ...(requested.length > 0 ? { scope: requested.join(' ') } : {}),
  });
};
