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

import { retryWhen, concatMap } from 'rxjs/operators';
import { defer, throwError, iif, timer } from 'rxjs';
import * as legacyElasticsearch from 'elasticsearch';

import { CallAPIOptions } from '.';
import { Logger } from '../logging';
import { APICaller } from './api_types';

const esErrors = legacyElasticsearch.errors;

/**
 * Retries the provided Elasticsearch API call when an error such as
 * `AuthenticationException` `NoConnections`, `ConnectionFault`,
 * `ServiceUnavailable` or `RequestTimeout` are encountered. The API call will
 * be retried once a second, indefinitely, until a successful response or a
 * different error is received.
 *
 * @param apiCaller
 */
export function migrationsRetryCallCluster(
  apiCaller: APICaller,
  log: Logger,
  delay: number = 2500
) {
  const previousErrors: string[] = [];
  return (endpoint: string, clientParams: Record<string, any> = {}, options?: CallAPIOptions) => {
    return defer(() => apiCaller(endpoint, clientParams, options))
      .pipe(
        retryWhen(error$ =>
          error$.pipe(
            concatMap((error, i) => {
              if (!previousErrors.includes(error.message)) {
                log.warn(`Unable to connect to Elasticsearch. Error: ${error.message}`);
                previousErrors.push(error.message);
              }
              return iif(
                () => {
                  return (
                    error instanceof esErrors.NoConnections ||
                    error instanceof esErrors.ConnectionFault ||
                    error instanceof esErrors.ServiceUnavailable ||
                    error instanceof esErrors.RequestTimeout ||
                    error instanceof esErrors.AuthenticationException ||
                    error instanceof esErrors.AuthorizationException ||
                    // @ts-ignore
                    error instanceof esErrors.Gone ||
                    error?.body?.error?.type === 'snapshot_in_progress_exception'
                  );
                },
                timer(delay),
                throwError(error)
              );
            })
          )
        )
      )
      .toPromise();
  };
}

/**
 * Retries the provided Elasticsearch API call when a `NoConnections` error is
 * encountered. The API call will be retried once a second, indefinitely, until
 * a successful response or a different error is received.
 *
 * @param apiCaller
 */
export function retryCallCluster(apiCaller: APICaller) {
  return (endpoint: string, clientParams: Record<string, any> = {}, options?: CallAPIOptions) => {
    return defer(() => apiCaller(endpoint, clientParams, options))
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            concatMap((error, i) =>
              iif(
                () => error instanceof legacyElasticsearch.errors.NoConnections,
                timer(1000),
                throwError(error)
              )
            )
          )
        )
      )
      .toPromise();
  };
}
