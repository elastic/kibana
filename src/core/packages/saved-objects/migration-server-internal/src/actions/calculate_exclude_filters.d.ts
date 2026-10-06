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
export declare const calculateExcludeFilters: ({ client, excludeFromUpgradeFilterHooks, hookTimeoutMs, }: CalculateExcludeFiltersParams) => TaskEither.TaskEither<RetryableEsClientError, CalculatedExcludeFilter>;
