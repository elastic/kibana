import type * as TaskEither from 'fp-ts/TaskEither';
import * as Option from 'fp-ts/Option';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface ReindexResponse {
    taskId: string;
}
/** @internal */
export interface ReindexParams {
    client: ElasticsearchClient;
    sourceIndex: string;
    targetIndex: string;
    reindexScript: Option.Option<string>;
    requireAlias: boolean;
    excludeOnUpgradeQuery: QueryDslQueryContainer;
    /** Number of documents Elasticsearch will read/write in each batch */
    batchSize: number;
}
/**
 * Reindex documents from the `sourceIndex` into the `targetIndex`. Returns a
 * task ID which can be tracked for progress.
 *
 * @remarks This action is idempotent allowing several Kibana instances to run
 * this in parallel. By using `op_type: 'create', conflicts: 'proceed'` there
 * will be only one write per reindexed document.
 */
export declare const reindex: ({ client, sourceIndex, targetIndex, reindexScript, requireAlias, excludeOnUpgradeQuery, batchSize, }: ReindexParams) => TaskEither.TaskEither<RetryableEsClientError, ReindexResponse>;
