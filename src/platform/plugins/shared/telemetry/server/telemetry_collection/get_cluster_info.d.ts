import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Get the cluster info from the connected cluster.
 *
 * This is the equivalent to GET /
 *
 * @param {function} esClient The asInternalUser handler (exposed for testing)
 */
export declare function getClusterInfo(esClient: ElasticsearchClient): Promise<import("@elastic/elasticsearch/lib/api/types").InfoResponse>;
