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
  excludeFilter: estypes.QueryDslQueryContainer;
}

export const calculateExcludeFilters = ({
  client,
  excludeFromUpgradeFilterHooks,
}: CalculateExcludeFiltersParams): TaskEither.TaskEither<
  RetryableEsClientError,
  CalculatedExcludeFilter
> => () => {
  return Promise.all(excludeFromUpgradeFilterHooks.map((hook) => hook(client)))
    .then((filters) => {
      const excludeFilter: estypes.QueryDslQueryContainer = {
        bool: { must_not: filters },
      };

      return Either.right({
        excludeFilter,
      });
    })
    .catch(catchRetryableEsClientErrors);
};
