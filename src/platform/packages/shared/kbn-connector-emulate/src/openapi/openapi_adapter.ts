/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractAdapter, Responder } from '../contract/types';
import type { OperationMatcherOptions } from './match_operation';
import { createOperationMatcher } from './match_operation';
import { describeOperation } from './schema_walk';
import type { ContractOperation } from './types';
import { validateRequest } from './validate_request';
import { validateResponse } from './validate_response';
import type { SecurityOptions } from './validate_security';
import { validateSecurity } from './validate_security';

export interface OpenApiAdapterOptions {
  readonly securityOptions?: SecurityOptions;
  readonly matcherOptions?: OperationMatcherOptions;
  /**
   * Operations whose schemas have defects. They are routed but answered 404 naming them, so their
   * requests don't reach another operation whose template also matches.
   */
  readonly broken?: readonly ContractOperation[];
}

/** Implements the contract steps for OpenAPI specs. */
export const createOpenApiAdapter = (
  operations: readonly ContractOperation[],
  respond: Responder,
  { securityOptions = {}, matcherOptions = {}, broken = [] }: OpenApiAdapterOptions = {}
): ContractAdapter => {
  const match = createOperationMatcher([...operations, ...broken], matcherOptions);
  const isBroken = new Set(broken);
  return {
    route: ({ method, url, headers }) => {
      const routed = match(method, url, headers);
      return 'operation' in routed && isBroken.has(routed.operation)
        ? {
            status: 404,
            message: `${describeOperation(
              routed.operation
            )} is left out, as its schema in the spec is invalid`,
          }
        : routed;
    },
    authenticate: ({ operation }, { query, headers }) =>
      validateSecurity(operation, { query, headers }, securityOptions),
    validateRequest: ({ operation, pathParameters }, { query, headers, body }) =>
      validateRequest(operation, { query, headers, pathParameters, body }),
    respond,
    validateResponse,
  };
};
