import type * as TaskEither from 'fp-ts/TaskEither';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { TargetIndexHadWriteBlock, RequestEntityTooLargeException, IndexNotFound, UnavailableShardsException } from '.';
import type { BulkOperation } from '../model/create_batches';
/** @internal */
export interface BulkOverwriteTransformedDocumentsParams {
    client: ElasticsearchClient;
    index: string;
    operations: BulkOperation[];
    refresh?: estypes.Refresh;
    /**
     * If true, we prevent Elasticsearch from auto-creating the index if it
     * doesn't exist. We use the ES paramater require_alias: true so `index`
     * must be an alias, otherwise the bulk index will fail.
     */
    useAliasToPreventAutoCreate?: boolean;
    /**
     * How long to wait for the request to complete, including waiting for
     * active shards. Defaults to DEFAULT_TIMEOUT (300s).
     */
    timeout?: string;
}
/**
 * Write the up-to-date transformed documents to the index, overwriting any
 * documents that are still on their outdated version.
 */
export declare const bulkOverwriteTransformedDocuments: ({ client, index, operations, refresh, useAliasToPreventAutoCreate, timeout, }: BulkOverwriteTransformedDocumentsParams) => TaskEither.TaskEither<RetryableEsClientError | TargetIndexHadWriteBlock | IndexNotFound | RequestEntityTooLargeException | UnavailableShardsException, "bulk_index_succeeded">;
