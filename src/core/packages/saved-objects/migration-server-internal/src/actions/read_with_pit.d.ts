import type * as TaskEither from 'fp-ts/TaskEither';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { EsResponseTooLargeError } from '.';
/** @internal */
export interface ReadWithPit {
    outdatedDocuments: SavedObjectsRawDoc[];
    readonly pitId: string;
    readonly lastHitSortValue: number[] | undefined;
    readonly totalHits: number | undefined;
}
/** @internal */
export interface ReadWithPitParams {
    client: ElasticsearchClient;
    pitId: string;
    query: estypes.QueryDslQueryContainer;
    batchSize: number;
    searchAfter?: number[];
    seqNoPrimaryTerm?: boolean;
    maxResponseSizeBytes?: number;
}
export declare const readWithPit: ({ client, pitId, query, batchSize, searchAfter, seqNoPrimaryTerm, maxResponseSizeBytes, }: ReadWithPitParams) => TaskEither.TaskEither<RetryableEsClientError | EsResponseTooLargeError, ReadWithPit>;
