import type { estypes } from '@elastic/elasticsearch';
import type { StatsGetter, StatsCollectionContext } from '@kbn/telemetry-collection-manager-plugin/server';
import type { KibanaUsageStats } from './get_kibana';
import type { DataTelemetryPayload } from './get_data_telemetry';
/**
 * Handle the separate local calls by combining them into a single object response that looks like the
 * "cluster_stats" document from X-Pack monitoring.
 *
 * @param {Object} server ??
 * @param {Object} clusterInfo Cluster info (GET /)
 * @param {Object} clusterStats Cluster stats (GET /_cluster/stats)
 * @param {Object} kibana The Kibana Usage stats
 * @param dataTelemetry The telemetry data
 * @param context The context
 */
export declare function handleLocalStats<ClusterStats extends estypes.ClusterStatsResponse>({ cluster_name, cluster_uuid, version }: estypes.InfoResponse, { _nodes, cluster_name: clusterName, ...clusterStats }: ClusterStats, kibana: KibanaUsageStats | undefined, dataTelemetry: DataTelemetryPayload | undefined, context: StatsCollectionContext): {
    timestamp: string;
    cluster_uuid: string;
    cluster_name: string;
    version: string;
    cluster_stats: Omit<ClusterStats, "cluster_name" | "_nodes">;
    collection: string;
    stack_stats: {
        data: DataTelemetryPayload | undefined;
        kibana: {
            count: number;
            indices: number;
            os: Record<string, unknown[]>;
            versions: {
                version: string;
                count: number;
            }[];
            plugins: {
                [plugin: string]: Record<string, unknown>;
            };
        } | undefined;
    };
};
/**
 * The payload structure as composed by the OSS telemetry collection mechanism.
 */
export type TelemetryLocalStats = ReturnType<typeof handleLocalStats>;
/**
 * Get statistics for all products joined by Elasticsearch cluster.
 * @internal only used externally by the X-Pack Telemetry extension
 * @param clustersDetails uuids array of cluster uuid's
 * @param config contains the usageCollection, callCluster (deprecated), the esClient and Saved Objects client scoped to the request or the internal repository, and the kibana request
 * @param context contains logger and version (string)
 */
export declare const getLocalStats: StatsGetter<TelemetryLocalStats>;
