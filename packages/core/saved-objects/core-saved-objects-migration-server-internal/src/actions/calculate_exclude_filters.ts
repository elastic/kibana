/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { withTimeout } from '@kbn/std';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import type { RetryableEsClientError } from '.';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

export interface CalculateExcludeFiltersParams {
  client: ElasticsearchClient;
  excludeFromUpgradeFilterHooks: Record<string, SavedObjectTypeExcludeFromUpgradeFilterHook>;
  hookTimeoutMs?: number;
}

export interface CalculatedExcludeFilter {
  /** Array with all the clauses that must be bool.must_not'ed */
  mustNotClauses: QueryDslQueryContainer[];
  /** Any errors that were encountered during filter calculation, keyed by the type name */
  errorsByType: Record<string, Error>;
}

export const calculateExcludeFilters =
  ({
    client,
    excludeFromUpgradeFilterHooks,
    hookTimeoutMs = 30_000, // default to 30s, exposed for testing
  }: CalculateExcludeFiltersParams): TaskEither.TaskEither<
    RetryableEsClientError,
    CalculatedExcludeFilter
  > =>
  () => {
    return Promise.all<
      | Either.Right<QueryDslQueryContainer>
      | Either.Left<{ soType: string; error: Error | RetryableEsClientError }>
    >(
      Object.entries(excludeFromUpgradeFilterHooks).map(([soType, hook]) =>
        withTimeout({
          promise: Promise.resolve(
            hook({
              readonlyEsClient: {
                search: client.search.bind(client) as ElasticsearchClient['search'],
              },
            })
          ),
          timeoutMs: hookTimeoutMs,
        })
          .then((result) =>
            result.timedout
              ? Either.left({
                  soType,
                  error: new Error(
                    `excludeFromUpgrade hook timed out after ${hookTimeoutMs / 1000} seconds.`
                  ),
                })
              : Either.right(result.value)
          )
          .catch((error) => {
            const retryableError = catchRetryableEsClientErrors(error);
            if (Either.isLeft(retryableError)) {
              return Either.left({ soType, error: retryableError.left });
            } else {
              // Really should never happen, only here to satisfy TypeScript
              return Either.left({
                soType,
                error: new Error(
                  `Unexpected return value from catchRetryableEsClientErrors: "${retryableError.toString()}"`
                ),
              });
            }
          })
          .catch((error: Error) => Either.left({ soType, error }))
      )
    ).then((results) => {
      const retryableError = results.find(
        (r) =>
          Either.isLeft(r) &&
          !(r.left.error instanceof Error) &&
          r.left.error.type === 'retryable_es_client_error'
      ) as Either.Left<{ soType: string; error: RetryableEsClientError }> | undefined;
      if (retryableError) {
        return Either.left(retryableError.left.error);
      }

      const errorsByType: Array<[string, Error]> = [];
      const mustNotClauses: QueryDslQueryContainer[] = [];

      // Loop through all results and collect successes and errors
      results.forEach((r) =>
        Either.isRight(r)
          ? mustNotClauses.push(r.right)
          : Either.isLeft(r) && errorsByType.push([r.left.soType, r.left.error as Error])
      );

      return Either.right({
        mustNotClauses,
        errorsByType: Object.fromEntries(errorsByType),
      });
    });
  };
