import type { Observable } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/** @internal */
export interface ClusterInfo {
    cluster_name: string;
    cluster_uuid: string;
    cluster_version: string;
    cluster_build_flavor?: string;
}
/**
 * Returns the cluster info from the Elasticsearch cluster.
 * @param internalClient Elasticsearch client
 * @internal
 */
export declare function getClusterInfo$(internalClient: ElasticsearchClient): Observable<ClusterInfo>;
