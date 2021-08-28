/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defer, throwError, iif, timer } from 'rxjs';
import { concatMap, retryWhen } from 'rxjs/operators';
import { Logger } from '../../logging';

const retryResponseStatuses = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
] as const;

/**
 * Retries the provided Elasticsearch API call when a `NoLivingConnectionsError` error is
 * encountered. The API call will be retried once a second, indefinitely, until
 * a successful response or a different error is received.
 *
 * @example
 * ```ts
 * const response = await retryCallCluster(() => client.ping());
 * ```
 *
 * @internal
 */
export const retryCallCluster = <T extends Promise<unknown>>(apiCaller: () => T): T => {
  return defer(() => apiCaller())
    .pipe(
      retryWhen((errors) =>
        errors.pipe(
          concatMap((error) =>
            iif(() => error.name === 'NoLivingConnectionsError', timer(1000), throwError(error))
          )
        )
      )
    )
    .toPromise() as T;
};

/**
 * Retries the provided Elasticsearch API call when an error such as
 * `AuthenticationException` `NoConnections`, `ConnectionFault`,
 * `ServiceUnavailable` or `RequestTimeout` are encountered. The API call will
 * be retried once a second, indefinitely, until a successful response or a
 * different error is received.
 *
 * @example
 * ```ts
 * const response = await migrationRetryCallCluster(() => client.ping(), logger);
 * ```
 *
 * @internal
 */
export const migrationRetryCallCluster = <T extends Promise<unknown>>(
  apiCaller: () => T,
  log: Logger,
  delay: number = 2500
): T => {
  const previousErrors: string[] = [];
  return defer(() => apiCaller())
    .pipe(
      retryWhen((errors) =>
        errors.pipe(
          concatMap((error) => {
            if (!previousErrors.includes(error.message)) {
              log.warn(`Unable to connect to Elasticsearch. Error: ${error.message}`);
              previousErrors.push(error.message);
            }
            return iif(
              () =>
                error.name === 'NoLivingConnectionsError' ||
                error.name === 'ConnectionError' ||
                error.name === 'TimeoutError' ||
                (error.name === 'ResponseError' &&
                  retryResponseStatuses.includes(error.statusCode)) ||
                error?.body?.error?.type === 'snapshot_in_progress_exception',
              timer(delay),
              throwError(error)
            );
          })
        )
      )
    )
    .toPromise() as T;
};
