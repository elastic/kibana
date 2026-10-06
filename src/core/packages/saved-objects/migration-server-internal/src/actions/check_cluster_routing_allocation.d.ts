import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
export interface IncompatibleClusterRoutingAllocation {
    type: 'incompatible_cluster_routing_allocation';
}
export declare const checkClusterRoutingAllocationEnabled: (client: ElasticsearchClient) => TaskEither.TaskEither<RetryableEsClientError | IncompatibleClusterRoutingAllocation, {}>;
