import type * as TaskEither from 'fp-ts/TaskEither';
import type { Conflicts, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface DeleteByQueryParams {
    client: ElasticsearchClient;
    indexName: string;
    query: QueryDslQueryContainer;
    conflicts: Conflicts;
    refresh?: boolean;
}
/** @internal */
export interface DeleteByQueryResponse {
    type: 'delete_by_query_response';
    taskId: string;
}
/**
 * Deletes documents matching the provided query
 */
export declare const deleteByQuery: ({ client, indexName, query, conflicts, refresh, }: DeleteByQueryParams) => TaskEither.TaskEither<RetryableEsClientError, DeleteByQueryResponse>;
