import * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { type SourceEqualsTarget, type IndexNotFound } from '.';
/** @internal */
export interface SafeWriteBlockParams {
    client: ElasticsearchClient;
    sourceIndex: string;
    targetIndex: string;
    timeout?: string;
}
export declare const safeWriteBlock: ({ client, sourceIndex, targetIndex, timeout, }: SafeWriteBlockParams) => TaskEither.TaskEither<SourceEqualsTarget | IndexNotFound | RetryableEsClientError, "set_write_block_succeeded">;
