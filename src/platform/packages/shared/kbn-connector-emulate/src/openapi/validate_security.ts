/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractOperation, Credential, SecurityRequirement, Violation } from './types';

export interface SecurityInput {
  readonly query: Readonly<Record<string, string | string[]>>;
  /** Lowercase header names. */
  readonly headers: Readonly<Record<string, string>>;
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

/**
 * Checks that the request carries the credentials of one of the operation's security
 * requirements, in the place each scheme declares. Credential values are not checked.
 */
export const validateSecurity = (
  { security }: ContractOperation,
  input: SecurityInput
): Violation[] => {
  if (security.length === 0 || security.some((requirement) => isSatisfied(requirement, input))) {
    return [];
  }
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
};
