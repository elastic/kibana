/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { grantedScopes } from './token_endpoints';
import type { ContractOperation, Credential, SecurityRequirement, Violation } from './types';

export interface SecurityInput {
  readonly query: Readonly<Record<string, string | string[]>>;
  /** Lowercase header names. */
  readonly headers: Readonly<Record<string, string>>;
}

export interface SecurityOptions {
  /**
   * Also check that a bearer token the mock issued was granted the scopes the operation's
   * OAuth 2 requirements list. Off by default, as some specs declare scopes loosely.
   */
  readonly checkScopes?: boolean;
}

const hasCookie = (header: string | undefined, name: string): boolean =>
  (header ?? '').split(';').some((cookie) => cookie.trim().startsWith(`${name}=`));

const isPresent = (credential: Credential, { query, headers }: SecurityInput): boolean => {
  switch (credential.in) {
    case 'header':
      return Boolean(headers[credential.name.toLowerCase()]);
    case 'query':
      return query[credential.name] !== undefined && query[credential.name] !== '';
    case 'cookie':
      return hasCookie(headers.cookie, credential.name);
    case 'authorization': {
      const [scheme, ...value] = (headers.authorization ?? '').trim().split(/\s+/);
      return scheme.toLowerCase() === credential.scheme && value.length > 0;
    }
  }
};

const describe = (credential: Credential): string => {
  switch (credential.in) {
    case 'header':
      return `header ${credential.name}`;
    case 'query':
      return `query parameter ${credential.name}`;
    case 'cookie':
      return `cookie ${credential.name}`;
    case 'authorization':
      return `Authorization: ${credential.scheme[0].toUpperCase()}${credential.scheme.slice(1)}`;
  }
};

// Schemes that can't be checked on a request, such as mutual TLS, count as satisfied.
const isSatisfied = (requirement: SecurityRequirement, input: SecurityInput): boolean =>
  requirement.every(({ credential }) => !credential || isPresent(credential, input));

const requiredScopes = (requirement: SecurityRequirement): string[] => [
  ...new Set(requirement.flatMap(({ scopes = [] }) => scopes)),
];

const bearerScopes = ({ headers }: SecurityInput): readonly string[] | undefined => {
  const [scheme, token] = (headers.authorization ?? '').trim().split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' && token ? grantedScopes(token) : undefined;
};

/**
 * The scopes the token lacks for the satisfied requirement it is closest to, or undefined when
 * scopes aren't checked: the token wasn't issued by the mock for specific scopes, or one of the
 * satisfied requirements needs no scope it lacks.
 */
const missingScopes = (
  { security }: ContractOperation,
  input: SecurityInput
):
  | { readonly granted: readonly string[]; readonly required: string[]; readonly missing: string[] }
  | undefined => {
  const granted = bearerScopes(input);
  if (!granted) {
    return undefined;
  }
  const candidates = security
    .filter((requirement) => isSatisfied(requirement, input))
    .map((requirement) => {
      const required = requiredScopes(requirement);
      return { granted, required, missing: required.filter((scope) => !granted.includes(scope)) };
    })
    .sort((a, b) => a.missing.length - b.missing.length);
  const [closest] = candidates;
  return closest && closest.missing.length > 0 ? closest : undefined;
};

/**
 * The `WWW-Authenticate` challenge for a request whose token lacks scopes (RFC 6750 §3.1), naming
 * the scopes of the requirement it is closest to; undefined when the token's scopes suffice.
 */
export const insufficientScopeChallenge = (
  operation: ContractOperation,
  input: SecurityInput
): string | undefined => {
  const found = missingScopes(operation, input);
  return found && `Bearer error="insufficient_scope", scope="${found.required.join(' ')}"`;
};

/**
 * Checks that the request carries the credentials of one of the operation's security
 * requirements, in the place each scheme declares. Credential values are not checked, except
 * that with `checkScopes` a token the mock issued must have the scopes of one of the requirements.
 */
export const validateSecurity = (
  operation: ContractOperation,
  input: SecurityInput,
  { checkScopes = false }: SecurityOptions = {}
): Violation[] => {
  const { security } = operation;
  if (security.length === 0) {
    return [];
  }
  if (!security.some((requirement) => isSatisfied(requirement, input))) {
    // Alternatives often repeat a scheme with different scopes.
    const alternatives = security.map((requirement) =>
      requirement
        .flatMap(({ credential }) => (credential ? [describe(credential)] : []))
        .join(' and ')
    );
    const expected = [...new Set(alternatives)].join(', or ');
    return [
      {
        path: ['security'],
        code: 'unauthenticated',
        message: `Request has no credentials for the operation; expected ${expected}`,
      },
    ];
  }
  const found = checkScopes ? missingScopes(operation, input) : undefined;
  if (!found) {
    return [];
  }
  const granted = found.granted.length > 0 ? found.granted.join(' ') : 'no scopes';
  return [
    {
      path: ['security'],
      code: 'insufficient_scope',
      message: `Token was granted ${granted}, but the operation also needs ${found.missing.join(
        ' '
      )} (requires ${found.required.join(' ')})`,
    },
  ];
};
