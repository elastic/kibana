import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Nodes {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * You can use this API to clear the archived repositories metering information in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/clear-repositories-metering-archive-api.html | Elasticsearch API documentation}
      */
    clearRepositoriesMeteringArchive(this: That, params: T.NodesClearRepositoriesMeteringArchiveRequest | TB.NodesClearRepositoriesMeteringArchiveRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesClearRepositoriesMeteringArchiveResponse>;
    clearRepositoriesMeteringArchive(this: That, params: T.NodesClearRepositoriesMeteringArchiveRequest | TB.NodesClearRepositoriesMeteringArchiveRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesClearRepositoriesMeteringArchiveResponse, unknown>>;
    clearRepositoriesMeteringArchive(this: That, params: T.NodesClearRepositoriesMeteringArchiveRequest | TB.NodesClearRepositoriesMeteringArchiveRequest, options?: TransportRequestOptions): Promise<T.NodesClearRepositoriesMeteringArchiveResponse>;
    /**
      * You can use the cluster repositories metering API to retrieve repositories metering information in a cluster. This API exposes monotonically non-decreasing counters and it’s expected that clients would durably store the information needed to compute aggregations over a period of time. Additionally, the information exposed by this API is volatile, meaning that it won’t be present after node restarts.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-repositories-metering-api.html | Elasticsearch API documentation}
      */
    getRepositoriesMeteringInfo(this: That, params: T.NodesGetRepositoriesMeteringInfoRequest | TB.NodesGetRepositoriesMeteringInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesGetRepositoriesMeteringInfoResponse>;
    getRepositoriesMeteringInfo(this: That, params: T.NodesGetRepositoriesMeteringInfoRequest | TB.NodesGetRepositoriesMeteringInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesGetRepositoriesMeteringInfoResponse, unknown>>;
    getRepositoriesMeteringInfo(this: That, params: T.NodesGetRepositoriesMeteringInfoRequest | TB.NodesGetRepositoriesMeteringInfoRequest, options?: TransportRequestOptions): Promise<T.NodesGetRepositoriesMeteringInfoResponse>;
    /**
      * This API yields a breakdown of the hot threads on each selected node in the cluster. The output is plain text with a breakdown of each node’s top hot threads.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-nodes-hot-threads.html | Elasticsearch API documentation}
      */
    hotThreads(this: That, params?: T.NodesHotThreadsRequest | TB.NodesHotThreadsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesHotThreadsResponse>;
    hotThreads(this: That, params?: T.NodesHotThreadsRequest | TB.NodesHotThreadsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesHotThreadsResponse, unknown>>;
    hotThreads(this: That, params?: T.NodesHotThreadsRequest | TB.NodesHotThreadsRequest, options?: TransportRequestOptions): Promise<T.NodesHotThreadsResponse>;
    /**
      * Returns cluster nodes information.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-nodes-info.html | Elasticsearch API documentation}
      */
    info(this: That, params?: T.NodesInfoRequest | TB.NodesInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesInfoResponse>;
    info(this: That, params?: T.NodesInfoRequest | TB.NodesInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesInfoResponse, unknown>>;
    info(this: That, params?: T.NodesInfoRequest | TB.NodesInfoRequest, options?: TransportRequestOptions): Promise<T.NodesInfoResponse>;
    /**
      * Reloads the keystore on nodes in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/secure-settings.html#reloadable-secure-settings | Elasticsearch API documentation}
      */
    reloadSecureSettings(this: That, params?: T.NodesReloadSecureSettingsRequest | TB.NodesReloadSecureSettingsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesReloadSecureSettingsResponse>;
    reloadSecureSettings(this: That, params?: T.NodesReloadSecureSettingsRequest | TB.NodesReloadSecureSettingsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesReloadSecureSettingsResponse, unknown>>;
    reloadSecureSettings(this: That, params?: T.NodesReloadSecureSettingsRequest | TB.NodesReloadSecureSettingsRequest, options?: TransportRequestOptions): Promise<T.NodesReloadSecureSettingsResponse>;
    /**
      * Returns cluster nodes statistics.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-nodes-stats.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.NodesStatsRequest | TB.NodesStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesStatsResponse>;
    stats(this: That, params?: T.NodesStatsRequest | TB.NodesStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesStatsResponse, unknown>>;
    stats(this: That, params?: T.NodesStatsRequest | TB.NodesStatsRequest, options?: TransportRequestOptions): Promise<T.NodesStatsResponse>;
    /**
      * Returns information on the usage of features.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-nodes-usage.html | Elasticsearch API documentation}
      */
    usage(this: That, params?: T.NodesUsageRequest | TB.NodesUsageRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.NodesUsageResponse>;
    usage(this: That, params?: T.NodesUsageRequest | TB.NodesUsageRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.NodesUsageResponse, unknown>>;
    usage(this: That, params?: T.NodesUsageRequest | TB.NodesUsageRequest, options?: TransportRequestOptions): Promise<T.NodesUsageResponse>;
}
export {};
