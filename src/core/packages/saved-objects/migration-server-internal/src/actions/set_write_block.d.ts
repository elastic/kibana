import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound } from '.';
/** @internal */
export interface SetWriteBlockParams {
    client: ElasticsearchClient;
    index: string;
    timeout?: string;
}
/**
 * Sets a write block in place for the given index. If the response includes
 * `acknowledged: true` all in-progress writes have drained and no further
 * writes to this index will be possible.
 *
 * The first time the write block is added to an index the response will
 * include `shards_acknowledged: true` but once the block is in place,
 * subsequent calls return `shards_acknowledged: false`
 */
export declare const setWriteBlock: ({ client, index, timeout, }: SetWriteBlockParams) => TaskEither.TaskEither<IndexNotFound | RetryableEsClientError, "set_write_block_succeeded">;
