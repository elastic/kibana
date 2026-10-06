/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import type { RetryableEsClientError } from '.';
export interface CalculateExcludeFiltersParams {
  client: ElasticsearchClient;
  excludeFromUpgradeFilterHooks: Record<string, SavedObjectTypeExcludeFromUpgradeFilterHook>;
  hookTimeoutMs?: number;
}
export interface CalculatedExcludeFilter {
  /** Array with all the clauses that must be bool.must_not'ed */
  filterClauses: QueryDslQueryContainer[];
  /** Any errors that were encountered during filter calculation, keyed by the type name */
  errorsByType: Record<string, Error>;
}
export declare const calculateExcludeFilters: ({
  client,
  excludeFromUpgradeFilterHooks,
  hookTimeoutMs,
}: CalculateExcludeFiltersParams) => TaskEither.TaskEither<
  RetryableEsClientError,
  CalculatedExcludeFilter
>;
