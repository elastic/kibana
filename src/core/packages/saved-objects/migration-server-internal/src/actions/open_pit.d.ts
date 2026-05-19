import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface OpenPitResponse {
    pitId: string;
}
/** @internal */
export interface OpenPitParams {
    client: ElasticsearchClient;
    index: string;
}
export declare const DEFAULT_PIT_KEEP_ALIVE = "10m";
export declare const openPit: ({ client, index, }: OpenPitParams) => TaskEither.TaskEither<RetryableEsClientError, OpenPitResponse>;
