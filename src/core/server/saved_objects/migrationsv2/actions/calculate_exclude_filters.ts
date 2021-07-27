/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { withTimeout } from '@kbn/std';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { RetryableEsClientError } from '.';
import { ElasticsearchClient } from '../../../elasticsearch';
import { SavedObjectTypeExcludeFromUpgradeFilterHook } from '../../types';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

export interface CalculateExcludeFiltersParams {
  client: ElasticsearchClient;
  excludeFromUpgradeFilterHooks: SavedObjectTypeExcludeFromUpgradeFilterHook[];
  hookTimeoutMs?: number;
}

export interface CalculatedExcludeFilter {
  /** Composite filter of all calculated filters */
  excludeFilter: estypes.QueryDslQueryContainer;
  /** Any errors that were encountered during filter calculation */
  errors: Error[];
}

export const calculateExcludeFilters = ({
  client,
  excludeFromUpgradeFilterHooks,
  hookTimeoutMs = 30_000, // default to 30s, exposed for testing
}: CalculateExcludeFiltersParams): TaskEither.TaskEither<
  RetryableEsClientError,
  CalculatedExcludeFilter
> => () => {
  return Promise.all(
    excludeFromUpgradeFilterHooks.map((hook) =>
      withTimeout({
        promise: Promise.resolve(
          hook({ readonlyEsClient: { search: client.search.bind(client) } })
        ),
        timeoutMs: hookTimeoutMs,
      })
        .then((result) =>
          result.timedout
            ? Either.left(
                new Error(
                  `excludeFromUpgrade hook timed out after ${hookTimeoutMs / 1000} seconds.`
                )
              )
            : Either.right(result.value)
        )
        .catch(catchRetryableEsClientErrors)
        .catch((error) => Either.left(error))
    )
  ).then((results) => {
    const retryableError = results.find(
      (r) => Either.isLeft(r) && r.left.type === 'retryable_es_client_error'
    ) as Either.Left<RetryableEsClientError> | undefined;
    if (retryableError) {
      return retryableError;
    }

    const errors: Error[] = [];
    const filters: estypes.QueryDslQueryContainer[] = [];

    // Loop through all results and collect successes and errors
    results.forEach((r) =>
      Either.isRight(r) ? filters.push(r.right) : Either.isLeft(r) && errors.push(r.left)
    );

    // Composite filter from all calculated filters that successfully executed
    const excludeFilter: estypes.QueryDslQueryContainer = {
      bool: { must_not: filters },
    };

    return Either.right({
      excludeFilter,
      errors,
    });
  });
};
