import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface RefreshIndexParams {
    client: ElasticsearchClient;
    index: string;
}
/**
 * Wait for Elasticsearch to reindex all the changes.
 */
export declare const refreshIndex: ({ client, index, }: RefreshIndexParams) => TaskEither.TaskEither<RetryableEsClientError, {
    refreshed: boolean;
}>;
