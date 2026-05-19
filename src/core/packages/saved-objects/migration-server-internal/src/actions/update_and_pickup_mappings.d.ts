import * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface UpdateAndPickupMappingsResponse {
    taskId: string;
}
/** @internal */
export interface UpdateAndPickupMappingsParams {
    client: ElasticsearchClient;
    index: string;
    mappings: IndexMapping;
    batchSize: number;
    query?: QueryDslQueryContainer;
}
/**
 * Updates an index's mappings and runs an pickupUpdatedMappings task so that the mapping
 * changes are "picked up". Returns a taskId to track progress.
 */
export declare const updateAndPickupMappings: ({ client, index, mappings, batchSize, query, }: UpdateAndPickupMappingsParams) => TaskEither.TaskEither<RetryableEsClientError, UpdateAndPickupMappingsResponse>;
