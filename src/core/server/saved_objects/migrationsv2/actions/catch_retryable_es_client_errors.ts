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

import * as Either from 'fp-ts/lib/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';

const retryResponseStatuses = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
];

export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}

export const catchRetryableEsClientErrors = (
  e: EsErrors.ElasticsearchClientError
): Either.Either<RetryableEsClientError, never> => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (retryResponseStatuses.includes(e.statusCode) ||
        // ES returns a 400 Bad Request when trying to close or delete an
        // index while snapshots are in progress. This should have been a 503
        // so once https://github.com/elastic/elasticsearch/issues/65883 is
        // fixed we can remove this.
        e.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e.message,
      error: e,
    });
  } else {
    throw e;
  }
};
