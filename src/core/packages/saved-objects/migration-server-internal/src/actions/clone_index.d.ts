import * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient, ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound, AcknowledgeResponse, OperationNotSupported } from '.';
import { type IndexNotGreenTimeout } from './wait_for_index_status';
import type { ClusterShardLimitExceeded } from './create_index';
export type CloneIndexResponse = AcknowledgeResponse;
/** @internal */
export interface CloneIndexParams {
    client: ElasticsearchClient;
    esCapabilities: ElasticsearchCapabilities;
    source: string;
    target: string;
    /** only used for testing */
    timeout?: string;
}
/**
 * Makes a clone of the source index into the target.
 *
 * @remarks
 * This method adds some additional logic to the ES clone index API:
 *  - it is idempotent, if it gets called multiple times subsequent calls will
 *    wait for the first clone operation to complete (up to 60s)
 *  - the first call will wait up to 120s for the cluster state and all shards
 *    to be updated.
 */
export declare const cloneIndex: ({ client, esCapabilities, source, target, timeout, }: CloneIndexParams) => TaskEither.TaskEither<RetryableEsClientError | IndexNotFound | IndexNotGreenTimeout | ClusterShardLimitExceeded | OperationNotSupported, CloneIndexResponse>;
