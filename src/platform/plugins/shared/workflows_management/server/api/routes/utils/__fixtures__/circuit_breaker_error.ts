/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';

/**
 * Mirrors `workflows_execution_engine/server/__fixtures__/circuit_breaker_error.ts`.
 * Duplicated rather than imported across plugin boundaries; if a fourth caller
 * appears, promote both copies into a shared `@kbn/workflows-test-utils` package.
 *
 * The shape `errors.ResponseError` accepts is derived from the constructor type
 * itself so the fixture stays aligned with whichever copy of `@elastic/transport`
 * the ES client uses (the package is duplicated under
 * `@elastic/elasticsearch/node_modules` and the top-level one is not the same
 * type identity).
 */
type ResponseErrorMeta = ConstructorParameters<typeof errors.ResponseError>[0];
type ResponseErrorDiagnosticMeta = ResponseErrorMeta['meta'];

type CircuitBreakerKind = 'parent' | 'fielddata' | 'request';

interface CircuitBreakerErrorOptions {
  kind?: CircuitBreakerKind;
  bytesWanted?: number;
  bytesLimit?: number;
  durability?: 'TRANSIENT' | 'PERMANENT';
}

const makeDiagnosticMeta = (): ResponseErrorDiagnosticMeta => ({
  context: null,
  name: 'elasticsearch-js',
  request: {
    params: { method: 'POST', path: '/_search' },
    options: {},
    id: 'circuit-breaker-fixture',
  },
  connection: null,
  attempts: 0,
  aborted: false,
});

export const createCircuitBreakerError = ({
  kind = 'parent',
  bytesWanted = 1_234_567_890,
  bytesLimit = 1_000_000_000,
  durability = 'TRANSIENT',
}: CircuitBreakerErrorOptions = {}): errors.ResponseError =>
  new errors.ResponseError({
    statusCode: 429,
    body: {
      error: {
        type: 'circuit_breaking_exception',
        reason: `[${kind}] Data too large, data for [<http_request>] would be [${bytesWanted}/${bytesWanted}b], which is larger than the limit of [${bytesLimit}/${bytesLimit}b]`,
        bytes_wanted: bytesWanted,
        bytes_limit: bytesLimit,
        durability,
      },
      status: 429,
    },
    headers: {},
    warnings: null,
    meta: makeDiagnosticMeta(),
  });
