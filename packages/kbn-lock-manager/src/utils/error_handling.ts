/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import { errors as esErrors } from '@elastic/elasticsearch';

export function getRetryConfig({
  logger,
  retryName,
  maxTimeout = 60_000,
}: {
  logger: Logger;
  retryName: string;
  maxTimeout?: number;
}) {
  return {
    retries: 8,
    factor: 2,
    minTimeout: 200,
    maxTimeout,
    randomize: true, // Randomize the timeout to avoid thundering herd problem
    onFailedAttempt: (err: pRetry.FailedAttemptError) => {
      logger.debug(
        `${retryName} attempt ${err.attemptNumber} failed${
          err.retriesLeft ? `; retries left: ${err.retriesLeft}` : ''
        }: ${err.message}`
      );
    },
  };
}

const retryResponseStatuses = [
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

export const isRetryableEsClientError = (e: Error): boolean => {
  const isCircuitBreakingException =
    e instanceof esErrors.ResponseError &&
    e.body?.error?.caused_by?.caused_by.type === 'circuit_breaking_exception';

  const isRetryableStatusCode =
    e instanceof esErrors.ResponseError && retryResponseStatuses.includes(e?.statusCode!);

  return (
    isCircuitBreakingException ||
    isRetryableStatusCode ||
    e instanceof esErrors.NoLivingConnectionsError ||
    e instanceof esErrors.ConnectionError ||
    e instanceof esErrors.TimeoutError
  );
};

export function isVersionConflictException(e: Error): boolean {
  return (
    e instanceof esErrors.ResponseError &&
    e.body?.error?.type === 'version_conflict_engine_exception'
  );
}

export function isDocumentMissingException(e: Error): boolean {
  return (
    e instanceof esErrors.ResponseError && e.body?.error?.type === 'document_missing_exception'
  );
}

export function isLockAcquisitionError(error: unknown): error is LockAcquisitionError {
  return error instanceof LockAcquisitionError;
}

export class LockAcquisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}

export function getEsReason(error: esErrors.ResponseError): string | undefined {
  if (error instanceof esErrors.ResponseError) {
    return error.body.error.caused_by.caused_by.reason || error.body.error.caused_by.reason;
  }
}
