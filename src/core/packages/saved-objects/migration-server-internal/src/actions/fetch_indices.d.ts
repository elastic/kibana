import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
export type FetchIndexResponse = Record<string, {
    aliases: Record<string, unknown>;
    mappings: IndexMapping;
    settings: unknown;
}>;
/** @internal */
export interface FetchIndicesParams {
    client: ElasticsearchClient;
    indices: string[];
}
/**
 * Fetches information about the given indices including aliases, mappings and
 * settings.
 */
export declare const fetchIndices: ({ client, indices, }: FetchIndicesParams) => TaskEither.TaskEither<RetryableEsClientError, FetchIndexResponse>;
