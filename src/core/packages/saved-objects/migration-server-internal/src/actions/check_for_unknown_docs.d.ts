import type * as TaskEither from 'fp-ts/TaskEither';
import type { Indices, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface CheckForUnknownDocsParams {
    client: ElasticsearchClient;
    indexName: string;
    excludeOnUpgradeQuery: QueryDslQueryContainer;
    knownTypes: string[];
}
/** @internal */
export interface DocumentIdAndType {
    id: string;
    type: string;
}
/** @internal */
export interface UnknownDocsFound {
    type: 'unknown_docs_found';
    unknownDocs: DocumentIdAndType[];
}
/**
 * Performs a search in ES, aggregating documents by type, retrieving a bunch
 * of documents for each type.
 *
 * @internal
 * @param esClient The ES client to perform the search query
 * @param targetIndices The ES indices to target
 * @param query An optional query that can be used to filter
 * @param options Additional search options
 * @param options.ignoreUnavailable When true, the search will not fail if any of the named
 *   `targetIndices` do not exist. Useful when the target list includes indices that may not yet
 *   have been created (e.g. version-aliased SO indices for plugins that were never loaded).
 * @returns A list of documents with their types
 */
export declare function getAggregatedTypesDocuments(esClient: ElasticsearchClient, targetIndices: Indices, query?: QueryDslQueryContainer, { ignoreUnavailable }?: {
    ignoreUnavailable?: boolean;
}): Promise<DocumentIdAndType[]>;
export declare const checkForUnknownDocs: ({ client, indexName, excludeOnUpgradeQuery, knownTypes, }: CheckForUnknownDocsParams) => TaskEither.TaskEither<RetryableEsClientError, UnknownDocsFound | {}>;
