/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractAdapter, Responder } from '../contract/types';
import { createOperationMatcher } from './match_operation';
import type { ContractOperation } from './types';
import { validateRequest } from './validate_request';
import { validateResponse } from './validate_response';
import type { SecurityOptions } from './validate_security';
import { validateSecurity } from './validate_security';

/** Implements the contract steps for OpenAPI specs. */
export const createOpenApiAdapter = (
  operations: readonly ContractOperation[],
  respond: Responder,
  securityOptions: SecurityOptions = {}
): ContractAdapter => {
  const match = createOperationMatcher(operations);
  return {
    route: ({ method, url, headers }) => match(method, url, headers),
    authenticate: ({ operation }, { query, headers }) =>
      validateSecurity(operation, { query, headers }, securityOptions),
    validateRequest: ({ operation, pathParameters }, { query, headers, body }) =>
      validateRequest(operation, { query, headers, pathParameters, body }),
    respond,
    validateResponse,
  };
};
