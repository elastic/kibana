import type { ElasticsearchCapabilities, ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type ClusterInfo } from './get_cluster_info';
export declare const getElasticsearchCapabilities: ({ clusterInfo, }: {
    clusterInfo: ClusterInfo;
}) => ElasticsearchCapabilities;
/**
 * Returns the capabilities for the ES cluster the provided client is connected to.
 *
 * @internal
 */
export declare const getCapabilitiesFromClient: (client: ElasticsearchClient) => Promise<ElasticsearchCapabilities>;
