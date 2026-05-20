import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
/**
 * Data returned by GET /_nodes/usage, but flattened as an array of {@link estypes.NodeUsageInformation}
 * with the node ID set in the field `node_id`.
 */
export interface NodeUsage extends estypes.NodesUsageNodeUsage {
    /**
     * The Node ID as reported by ES
     */
    node_id: string;
}
export type NodesUsageGetter = (esClient: ElasticsearchClient) => Promise<{
    nodes: NodeUsage[];
}>;
/**
 * Get the nodes usage data from the connected cluster.
 *
 * This is the equivalent to GET /_nodes/usage?timeout=30s.
 *
 * The Nodes usage API was introduced in v6.0.0
 */
export declare function fetchNodesUsage(esClient: ElasticsearchClient): Promise<estypes.NodesUsageResponse>;
/**
 * Get the nodes usage from the connected cluster
 * @param callCluster APICaller
 * @returns Object containing array of modified usage information with the node_id nested within the data for that node.
 */
export declare const getNodesUsage: NodesUsageGetter;
