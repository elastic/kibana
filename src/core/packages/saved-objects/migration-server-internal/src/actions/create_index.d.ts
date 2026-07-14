import * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient, ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import { type IndexNotGreenTimeout } from './wait_for_index_status';
/** @internal */
export interface ClusterShardLimitExceeded {
    type: 'cluster_shard_limit_exceeded';
}
/** @internal */
export interface CreateIndexParams {
    client: ElasticsearchClient;
    indexName: string;
    mappings: IndexMapping;
    esCapabilities: ElasticsearchCapabilities;
    aliases?: string[];
    timeout?: string;
    waitForIndexStatusTimeout?: string;
}
export type CreateIndexSuccessResponse = 'create_index_succeeded' | 'index_already_exists';
/**
 * Creates an index with the given mappings
 *
 * @remarks
 * This method adds some additional logic to the ES create index API:
 *  - it is idempotent, if it gets called multiple times subsequent calls will
 *    wait for the first create operation to complete (up to 60s)
 *  - the first call will wait up to 120s for the cluster state and all shards
 *    to be updated.
 */
export declare const createIndex: ({ client, indexName, mappings, esCapabilities, aliases, timeout, waitForIndexStatusTimeout, }: CreateIndexParams) => TaskEither.TaskEither<RetryableEsClientError | IndexNotGreenTimeout | ClusterShardLimitExceeded, CreateIndexSuccessResponse>;
