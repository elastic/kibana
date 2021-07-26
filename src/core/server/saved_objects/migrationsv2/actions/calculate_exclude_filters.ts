/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { RetryableEsClientError } from '.';
import { ElasticsearchClient } from '../../../elasticsearch';
import { SavedObjectTypeExcludeFromUpgradeFilterHook } from '../../types';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';

export interface CalculateExcludeFiltersParams {
  client: ElasticsearchClient;
  excludeFromUpgradeFilterHooks: SavedObjectTypeExcludeFromUpgradeFilterHook[];
}

export interface CalculatedExcludeFilter {
  /** Composite filter of all calculated filters */
  excludeFilter: estypes.QueryDslQueryContainer;
  /** Any errors that were encountered during filter calculation */
  errors: any[];
}

export const calculateExcludeFilters = ({
  client,
  excludeFromUpgradeFilterHooks,
}: CalculateExcludeFiltersParams): TaskEither.TaskEither<
  RetryableEsClientError,
  CalculatedExcludeFilter
> => () => {
  return Promise.all(
    excludeFromUpgradeFilterHooks.map((hook) =>
      hook(client)
        // .then((filter) => ({ filter, error: null }))
        .then((filter) => Either.right(filter))
        .catch(catchRetryableEsClientErrors)
        // .catch((error) => ({ filter: null, error }))
        .catch((error) => Either.left(error))
    )
  ).then((results) => {
    const errors: any[] = [];
    const filters: estypes.QueryDslQueryContainer[] = [];

    // Loop through all results and collect successes and errors
    for (const r of results) {
      if (Either.isRight(r)) {
        filters.push(r.right);
      } else if (Either.isLeft(r)) {
        // If any errors are retryable, return immediately so this whole action
        // can be retried.
        if (r.left.type === 'retryable_es_client_error') {
          return r;
        } else {
          errors.push(r.left);
        }
      }
    }

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
