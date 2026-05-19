import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface RemoveWriteBlockParams {
    client: ElasticsearchClient;
    index: string;
    timeout?: string;
}
/**
 * Removes a write block from an index
 */
export declare const removeWriteBlock: ({ client, index, timeout, }: RemoveWriteBlockParams) => TaskEither.TaskEither<RetryableEsClientError, "remove_write_block_succeeded">;
