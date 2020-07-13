/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defer, throwError, iif, timer } from 'rxjs';
import { concatMap, retryWhen } from 'rxjs/operators';
import { errors as esErrors } from '@elastic/elasticsearch';
import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { Logger } from '../../logging';

type ApiCaller = <TResponse, TContext>() => TransportRequestPromise<
  ApiResponse<TResponse, TContext>
>;

const retryMigrationStatusCodes = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  410, // Gone
];

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
export const retryCallCluster = <TResponse, TContext>(
  apiCaller: ApiCaller<TResponse, TContext>
): TransportRequestPromise<ApiResponse<TResponse, TContext>> => {
  return defer(() => apiCaller())
    .pipe(
      retryWhen((errors) =>
        errors.pipe(
          concatMap((error, i) =>
            iif(
              () => error instanceof esErrors.NoLivingConnectionsError,
              timer(1000),
              throwError(error)
            )
          )
        )
      )
    )
    .toPromise();
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
export const migrationRetryCallCluster = <TResponse, TContext>(
  apiCaller: ApiCaller<TResponse, TContext>,
  log: Logger,
  delay: number = 2500
): TransportRequestPromise<ApiResponse<TResponse, TContext>> => {
  const previousErrors: string[] = [];
  return defer(() => apiCaller())
    .pipe(
      retryWhen((errors) =>
        errors.pipe(
          concatMap((error, i) => {
            if (!previousErrors.includes(error.message)) {
              log.warn(`Unable to connect to Elasticsearch. Error: ${error.message}`);
              previousErrors.push(error.message);
            }
            return iif(
              () =>
                error instanceof esErrors.NoLivingConnectionsError ||
                error instanceof esErrors.ConnectionError ||
                error instanceof esErrors.TimeoutError ||
                retryMigrationStatusCodes.includes(error.statusCode) ||
                error?.body?.error?.type === 'snapshot_in_progress_exception',
              timer(delay),
              throwError(error)
            );
          })
        )
      )
    )
    .toPromise();
};
