import type { ClusterDetailsGetter } from '@kbn/telemetry-collection-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=60s&include_remotes=true
 */
export declare function getClusterStats(esClient: ElasticsearchClient): Promise<import("@elastic/elasticsearch/lib/api/types").ClusterStatsStatsResponseBase>;
/**
 * Get the cluster uuids from the connected cluster.
 * @internal only used externally by the X-Pack Telemetry extension
 * @param esClient Scoped Elasticsearch client
 */
export declare const getClusterUuids: ClusterDetailsGetter;
