import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface UpdateMappingsParams {
    client: ElasticsearchClient;
    index: string;
    mappings: Partial<IndexMapping>;
}
/** @internal */
export interface IncompatibleMappingException {
    type: 'incompatible_mapping_exception';
}
/**
 * Attempts to update the SO index mappings.
 * Includes an automatic retry mechanism for retriable errors.
 * Returns an 'update_mappings_succeeded' upon success.
 * If changes in the mappings are NOT compatible and the update fails on ES side,
 * this method will return an 'incompatible_mapping_exception'.
 */
export declare const updateMappings: ({ client, index, mappings, }: UpdateMappingsParams) => TaskEither.TaskEither<RetryableEsClientError | IncompatibleMappingException, "update_mappings_succeeded">;
