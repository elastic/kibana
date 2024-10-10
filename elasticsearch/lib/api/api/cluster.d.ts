import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Cluster {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Provides explanations for shard allocations in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-allocation-explain.html | Elasticsearch API documentation}
      */
    allocationExplain(this: That, params?: T.ClusterAllocationExplainRequest | TB.ClusterAllocationExplainRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterAllocationExplainResponse>;
    allocationExplain(this: That, params?: T.ClusterAllocationExplainRequest | TB.ClusterAllocationExplainRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterAllocationExplainResponse, unknown>>;
    allocationExplain(this: That, params?: T.ClusterAllocationExplainRequest | TB.ClusterAllocationExplainRequest, options?: TransportRequestOptions): Promise<T.ClusterAllocationExplainResponse>;
    /**
      * Deletes component templates. Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-component-template.html | Elasticsearch API documentation}
      */
    deleteComponentTemplate(this: That, params: T.ClusterDeleteComponentTemplateRequest | TB.ClusterDeleteComponentTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterDeleteComponentTemplateResponse>;
    deleteComponentTemplate(this: That, params: T.ClusterDeleteComponentTemplateRequest | TB.ClusterDeleteComponentTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterDeleteComponentTemplateResponse, unknown>>;
    deleteComponentTemplate(this: That, params: T.ClusterDeleteComponentTemplateRequest | TB.ClusterDeleteComponentTemplateRequest, options?: TransportRequestOptions): Promise<T.ClusterDeleteComponentTemplateResponse>;
    /**
      * Clears cluster voting config exclusions.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/voting-config-exclusions.html | Elasticsearch API documentation}
      */
    deleteVotingConfigExclusions(this: That, params?: T.ClusterDeleteVotingConfigExclusionsRequest | TB.ClusterDeleteVotingConfigExclusionsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterDeleteVotingConfigExclusionsResponse>;
    deleteVotingConfigExclusions(this: That, params?: T.ClusterDeleteVotingConfigExclusionsRequest | TB.ClusterDeleteVotingConfigExclusionsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterDeleteVotingConfigExclusionsResponse, unknown>>;
    deleteVotingConfigExclusions(this: That, params?: T.ClusterDeleteVotingConfigExclusionsRequest | TB.ClusterDeleteVotingConfigExclusionsRequest, options?: TransportRequestOptions): Promise<T.ClusterDeleteVotingConfigExclusionsResponse>;
    /**
      * Returns information about whether a particular component template exist
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-component-template.html | Elasticsearch API documentation}
      */
    existsComponentTemplate(this: That, params: T.ClusterExistsComponentTemplateRequest | TB.ClusterExistsComponentTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterExistsComponentTemplateResponse>;
    existsComponentTemplate(this: That, params: T.ClusterExistsComponentTemplateRequest | TB.ClusterExistsComponentTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterExistsComponentTemplateResponse, unknown>>;
    existsComponentTemplate(this: That, params: T.ClusterExistsComponentTemplateRequest | TB.ClusterExistsComponentTemplateRequest, options?: TransportRequestOptions): Promise<T.ClusterExistsComponentTemplateResponse>;
    /**
      * Retrieves information about component templates.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-component-template.html | Elasticsearch API documentation}
      */
    getComponentTemplate(this: That, params?: T.ClusterGetComponentTemplateRequest | TB.ClusterGetComponentTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterGetComponentTemplateResponse>;
    getComponentTemplate(this: That, params?: T.ClusterGetComponentTemplateRequest | TB.ClusterGetComponentTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterGetComponentTemplateResponse, unknown>>;
    getComponentTemplate(this: That, params?: T.ClusterGetComponentTemplateRequest | TB.ClusterGetComponentTemplateRequest, options?: TransportRequestOptions): Promise<T.ClusterGetComponentTemplateResponse>;
    /**
      * Returns cluster-wide settings. By default, it returns only settings that have been explicitly defined.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-get-settings.html | Elasticsearch API documentation}
      */
    getSettings(this: That, params?: T.ClusterGetSettingsRequest | TB.ClusterGetSettingsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterGetSettingsResponse>;
    getSettings(this: That, params?: T.ClusterGetSettingsRequest | TB.ClusterGetSettingsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterGetSettingsResponse, unknown>>;
    getSettings(this: That, params?: T.ClusterGetSettingsRequest | TB.ClusterGetSettingsRequest, options?: TransportRequestOptions): Promise<T.ClusterGetSettingsResponse>;
    /**
      * The cluster health API returns a simple status on the health of the cluster. You can also use the API to get the health status of only specified data streams and indices. For data streams, the API retrieves the health status of the stream’s backing indices. The cluster health status is: green, yellow or red. On the shard level, a red status indicates that the specific shard is not allocated in the cluster, yellow means that the primary shard is allocated but replicas are not, and green means that all shards are allocated. The index level status is controlled by the worst shard status. The cluster status is controlled by the worst index status.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-health.html | Elasticsearch API documentation}
      */
    health(this: That, params?: T.ClusterHealthRequest | TB.ClusterHealthRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterHealthResponse>;
    health(this: That, params?: T.ClusterHealthRequest | TB.ClusterHealthRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterHealthResponse, unknown>>;
    health(this: That, params?: T.ClusterHealthRequest | TB.ClusterHealthRequest, options?: TransportRequestOptions): Promise<T.ClusterHealthResponse>;
    /**
      * Returns different information about the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-info.html | Elasticsearch API documentation}
      */
    info(this: That, params: T.ClusterInfoRequest | TB.ClusterInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterInfoResponse>;
    info(this: That, params: T.ClusterInfoRequest | TB.ClusterInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterInfoResponse, unknown>>;
    info(this: That, params: T.ClusterInfoRequest | TB.ClusterInfoRequest, options?: TransportRequestOptions): Promise<T.ClusterInfoResponse>;
    /**
      * Returns cluster-level changes (such as create index, update mapping, allocate or fail shard) that have not yet been executed. NOTE: This API returns a list of any pending updates to the cluster state. These are distinct from the tasks reported by the Task Management API which include periodic tasks and tasks initiated by the user, such as node stats, search queries, or create index requests. However, if a user-initiated task such as a create index command causes a cluster state update, the activity of this task might be reported by both task api and pending cluster tasks API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-pending.html | Elasticsearch API documentation}
      */
    pendingTasks(this: That, params?: T.ClusterPendingTasksRequest | TB.ClusterPendingTasksRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterPendingTasksResponse>;
    pendingTasks(this: That, params?: T.ClusterPendingTasksRequest | TB.ClusterPendingTasksRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterPendingTasksResponse, unknown>>;
    pendingTasks(this: That, params?: T.ClusterPendingTasksRequest | TB.ClusterPendingTasksRequest, options?: TransportRequestOptions): Promise<T.ClusterPendingTasksResponse>;
    /**
      * Updates the cluster voting config exclusions by node ids or node names.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/voting-config-exclusions.html | Elasticsearch API documentation}
      */
    postVotingConfigExclusions(this: That, params?: T.ClusterPostVotingConfigExclusionsRequest | TB.ClusterPostVotingConfigExclusionsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterPostVotingConfigExclusionsResponse>;
    postVotingConfigExclusions(this: That, params?: T.ClusterPostVotingConfigExclusionsRequest | TB.ClusterPostVotingConfigExclusionsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterPostVotingConfigExclusionsResponse, unknown>>;
    postVotingConfigExclusions(this: That, params?: T.ClusterPostVotingConfigExclusionsRequest | TB.ClusterPostVotingConfigExclusionsRequest, options?: TransportRequestOptions): Promise<T.ClusterPostVotingConfigExclusionsResponse>;
    /**
      * Creates or updates a component template. Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases. An index template can be composed of multiple component templates. To use a component template, specify it in an index template’s `composed_of` list. Component templates are only applied to new data streams and indices as part of a matching index template. Settings and mappings specified directly in the index template or the create index request override any settings or mappings specified in a component template. Component templates are only used during index creation. For data streams, this includes data stream creation and the creation of a stream’s backing indices. Changes to component templates do not affect existing indices, including a stream’s backing indices. You can use C-style `/* *\/` block comments in component templates. You can include comments anywhere in the request body except before the opening curly bracket.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-component-template.html | Elasticsearch API documentation}
      */
    putComponentTemplate(this: That, params: T.ClusterPutComponentTemplateRequest | TB.ClusterPutComponentTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterPutComponentTemplateResponse>;
    putComponentTemplate(this: That, params: T.ClusterPutComponentTemplateRequest | TB.ClusterPutComponentTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterPutComponentTemplateResponse, unknown>>;
    putComponentTemplate(this: That, params: T.ClusterPutComponentTemplateRequest | TB.ClusterPutComponentTemplateRequest, options?: TransportRequestOptions): Promise<T.ClusterPutComponentTemplateResponse>;
    /**
      * Updates the cluster settings.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-update-settings.html | Elasticsearch API documentation}
      */
    putSettings(this: That, params?: T.ClusterPutSettingsRequest | TB.ClusterPutSettingsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterPutSettingsResponse>;
    putSettings(this: That, params?: T.ClusterPutSettingsRequest | TB.ClusterPutSettingsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterPutSettingsResponse, unknown>>;
    putSettings(this: That, params?: T.ClusterPutSettingsRequest | TB.ClusterPutSettingsRequest, options?: TransportRequestOptions): Promise<T.ClusterPutSettingsResponse>;
    /**
      * The cluster remote info API allows you to retrieve all of the configured remote cluster information. It returns connection and endpoint information keyed by the configured remote cluster alias.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-remote-info.html | Elasticsearch API documentation}
      */
    remoteInfo(this: That, params?: T.ClusterRemoteInfoRequest | TB.ClusterRemoteInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterRemoteInfoResponse>;
    remoteInfo(this: That, params?: T.ClusterRemoteInfoRequest | TB.ClusterRemoteInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterRemoteInfoResponse, unknown>>;
    remoteInfo(this: That, params?: T.ClusterRemoteInfoRequest | TB.ClusterRemoteInfoRequest, options?: TransportRequestOptions): Promise<T.ClusterRemoteInfoResponse>;
    /**
      * Allows to manually change the allocation of individual shards in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-reroute.html | Elasticsearch API documentation}
      */
    reroute(this: That, params?: T.ClusterRerouteRequest | TB.ClusterRerouteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterRerouteResponse>;
    reroute(this: That, params?: T.ClusterRerouteRequest | TB.ClusterRerouteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterRerouteResponse, unknown>>;
    reroute(this: That, params?: T.ClusterRerouteRequest | TB.ClusterRerouteRequest, options?: TransportRequestOptions): Promise<T.ClusterRerouteResponse>;
    /**
      * Returns a comprehensive information about the state of the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-state.html | Elasticsearch API documentation}
      */
    state(this: That, params?: T.ClusterStateRequest | TB.ClusterStateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterStateResponse>;
    state(this: That, params?: T.ClusterStateRequest | TB.ClusterStateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterStateResponse, unknown>>;
    state(this: That, params?: T.ClusterStateRequest | TB.ClusterStateRequest, options?: TransportRequestOptions): Promise<T.ClusterStateResponse>;
    /**
      * Returns cluster statistics. It returns basic index metrics (shard numbers, store size, memory usage) and information about the current nodes that form the cluster (number, roles, os, jvm versions, memory usage, cpu and installed plugins).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cluster-stats.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.ClusterStatsRequest | TB.ClusterStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClusterStatsResponse>;
    stats(this: That, params?: T.ClusterStatsRequest | TB.ClusterStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClusterStatsResponse, unknown>>;
    stats(this: That, params?: T.ClusterStatsRequest | TB.ClusterStatsRequest, options?: TransportRequestOptions): Promise<T.ClusterStatsResponse>;
}
export {};
