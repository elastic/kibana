import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Cat {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Retrieves the cluster’s index aliases, including filter and routing information. The API does not return data stream aliases. IMPORTANT: cat APIs are only intended for human consumption using the command line or the Kibana console. They are not intended for use by applications. For application consumption, use the aliases API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-alias.html | Elasticsearch API documentation}
      */
    aliases(this: That, params?: T.CatAliasesRequest | TB.CatAliasesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatAliasesResponse>;
    aliases(this: That, params?: T.CatAliasesRequest | TB.CatAliasesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatAliasesResponse, unknown>>;
    aliases(this: That, params?: T.CatAliasesRequest | TB.CatAliasesRequest, options?: TransportRequestOptions): Promise<T.CatAliasesResponse>;
    /**
      * Provides a snapshot of the number of shards allocated to each data node and their disk space. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-allocation.html | Elasticsearch API documentation}
      */
    allocation(this: That, params?: T.CatAllocationRequest | TB.CatAllocationRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatAllocationResponse>;
    allocation(this: That, params?: T.CatAllocationRequest | TB.CatAllocationRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatAllocationResponse, unknown>>;
    allocation(this: That, params?: T.CatAllocationRequest | TB.CatAllocationRequest, options?: TransportRequestOptions): Promise<T.CatAllocationResponse>;
    /**
      * Returns information about component templates in a cluster. Component templates are building blocks for constructing index templates that specify index mappings, settings, and aliases. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get component template API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-component-templates.html | Elasticsearch API documentation}
      */
    componentTemplates(this: That, params?: T.CatComponentTemplatesRequest | TB.CatComponentTemplatesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatComponentTemplatesResponse>;
    componentTemplates(this: That, params?: T.CatComponentTemplatesRequest | TB.CatComponentTemplatesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatComponentTemplatesResponse, unknown>>;
    componentTemplates(this: That, params?: T.CatComponentTemplatesRequest | TB.CatComponentTemplatesRequest, options?: TransportRequestOptions): Promise<T.CatComponentTemplatesResponse>;
    /**
      * Provides quick access to a document count for a data stream, an index, or an entire cluster. NOTE: The document count only includes live documents, not deleted documents which have not yet been removed by the merge process. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the count API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-count.html | Elasticsearch API documentation}
      */
    count(this: That, params?: T.CatCountRequest | TB.CatCountRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatCountResponse>;
    count(this: That, params?: T.CatCountRequest | TB.CatCountRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatCountResponse, unknown>>;
    count(this: That, params?: T.CatCountRequest | TB.CatCountRequest, options?: TransportRequestOptions): Promise<T.CatCountResponse>;
    /**
      * Returns the amount of heap memory currently used by the field data cache on every data node in the cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes stats API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-fielddata.html | Elasticsearch API documentation}
      */
    fielddata(this: That, params?: T.CatFielddataRequest | TB.CatFielddataRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatFielddataResponse>;
    fielddata(this: That, params?: T.CatFielddataRequest | TB.CatFielddataRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatFielddataResponse, unknown>>;
    fielddata(this: That, params?: T.CatFielddataRequest | TB.CatFielddataRequest, options?: TransportRequestOptions): Promise<T.CatFielddataResponse>;
    /**
      * Returns the health status of a cluster, similar to the cluster health API. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the cluster health API. This API is often used to check malfunctioning clusters. To help you track cluster health alongside log files and alerting systems, the API returns timestamps in two formats: `HH:MM:SS`, which is human-readable but includes no date information; `Unix epoch time`, which is machine-sortable and includes date information. The latter format is useful for cluster recoveries that take multiple days. You can use the cat health API to verify cluster health across multiple nodes. You also can use the API to track the recovery of a large cluster over a longer period of time.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-health.html | Elasticsearch API documentation}
      */
    health(this: That, params?: T.CatHealthRequest | TB.CatHealthRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatHealthResponse>;
    health(this: That, params?: T.CatHealthRequest | TB.CatHealthRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatHealthResponse, unknown>>;
    health(this: That, params?: T.CatHealthRequest | TB.CatHealthRequest, options?: TransportRequestOptions): Promise<T.CatHealthResponse>;
    /**
      * Returns help for the Cat APIs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat.html | Elasticsearch API documentation}
      */
    help(this: That, params?: T.CatHelpRequest | TB.CatHelpRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatHelpResponse>;
    help(this: That, params?: T.CatHelpRequest | TB.CatHelpRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatHelpResponse, unknown>>;
    help(this: That, params?: T.CatHelpRequest | TB.CatHelpRequest, options?: TransportRequestOptions): Promise<T.CatHelpResponse>;
    /**
      * Returns high-level information about indices in a cluster, including backing indices for data streams. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index API. Use the cat indices API to get the following information for each index in a cluster: shard count; document count; deleted document count; primary store size; total store size of all shards, including shard replicas. These metrics are retrieved directly from Lucene, which Elasticsearch uses internally to power indexing and search. As a result, all document counts include hidden nested documents. To get an accurate count of Elasticsearch documents, use the cat count or count APIs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-indices.html | Elasticsearch API documentation}
      */
    indices(this: That, params?: T.CatIndicesRequest | TB.CatIndicesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatIndicesResponse>;
    indices(this: That, params?: T.CatIndicesRequest | TB.CatIndicesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatIndicesResponse, unknown>>;
    indices(this: That, params?: T.CatIndicesRequest | TB.CatIndicesRequest, options?: TransportRequestOptions): Promise<T.CatIndicesResponse>;
    /**
      * Returns information about the master node, including the ID, bound IP address, and name. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-master.html | Elasticsearch API documentation}
      */
    master(this: That, params?: T.CatMasterRequest | TB.CatMasterRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatMasterResponse>;
    master(this: That, params?: T.CatMasterRequest | TB.CatMasterRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatMasterResponse, unknown>>;
    master(this: That, params?: T.CatMasterRequest | TB.CatMasterRequest, options?: TransportRequestOptions): Promise<T.CatMasterResponse>;
    /**
      * Returns configuration and usage information about data frame analytics jobs. IMPORTANT: cat APIs are only intended for human consumption using the Kibana console or command line. They are not intended for use by applications. For application consumption, use the get data frame analytics jobs statistics API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-dfanalytics.html | Elasticsearch API documentation}
      */
    mlDataFrameAnalytics(this: That, params?: T.CatMlDataFrameAnalyticsRequest | TB.CatMlDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatMlDataFrameAnalyticsResponse>;
    mlDataFrameAnalytics(this: That, params?: T.CatMlDataFrameAnalyticsRequest | TB.CatMlDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatMlDataFrameAnalyticsResponse, unknown>>;
    mlDataFrameAnalytics(this: That, params?: T.CatMlDataFrameAnalyticsRequest | TB.CatMlDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.CatMlDataFrameAnalyticsResponse>;
    /**
      * Returns configuration and usage information about datafeeds. This API returns a maximum of 10,000 datafeeds. If the Elasticsearch security features are enabled, you must have `monitor_ml`, `monitor`, `manage_ml`, or `manage` cluster privileges to use this API. IMPORTANT: cat APIs are only intended for human consumption using the Kibana console or command line. They are not intended for use by applications. For application consumption, use the get datafeed statistics API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-datafeeds.html | Elasticsearch API documentation}
      */
    mlDatafeeds(this: That, params?: T.CatMlDatafeedsRequest | TB.CatMlDatafeedsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatMlDatafeedsResponse>;
    mlDatafeeds(this: That, params?: T.CatMlDatafeedsRequest | TB.CatMlDatafeedsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatMlDatafeedsResponse, unknown>>;
    mlDatafeeds(this: That, params?: T.CatMlDatafeedsRequest | TB.CatMlDatafeedsRequest, options?: TransportRequestOptions): Promise<T.CatMlDatafeedsResponse>;
    /**
      * Returns configuration and usage information for anomaly detection jobs. This API returns a maximum of 10,000 jobs. If the Elasticsearch security features are enabled, you must have `monitor_ml`, `monitor`, `manage_ml`, or `manage` cluster privileges to use this API. IMPORTANT: cat APIs are only intended for human consumption using the Kibana console or command line. They are not intended for use by applications. For application consumption, use the get anomaly detection job statistics API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-anomaly-detectors.html | Elasticsearch API documentation}
      */
    mlJobs(this: That, params?: T.CatMlJobsRequest | TB.CatMlJobsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatMlJobsResponse>;
    mlJobs(this: That, params?: T.CatMlJobsRequest | TB.CatMlJobsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatMlJobsResponse, unknown>>;
    mlJobs(this: That, params?: T.CatMlJobsRequest | TB.CatMlJobsRequest, options?: TransportRequestOptions): Promise<T.CatMlJobsResponse>;
    /**
      * Returns configuration and usage information about inference trained models. IMPORTANT: cat APIs are only intended for human consumption using the Kibana console or command line. They are not intended for use by applications. For application consumption, use the get trained models statistics API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-trained-model.html | Elasticsearch API documentation}
      */
    mlTrainedModels(this: That, params?: T.CatMlTrainedModelsRequest | TB.CatMlTrainedModelsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatMlTrainedModelsResponse>;
    mlTrainedModels(this: That, params?: T.CatMlTrainedModelsRequest | TB.CatMlTrainedModelsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatMlTrainedModelsResponse, unknown>>;
    mlTrainedModels(this: That, params?: T.CatMlTrainedModelsRequest | TB.CatMlTrainedModelsRequest, options?: TransportRequestOptions): Promise<T.CatMlTrainedModelsResponse>;
    /**
      * Returns information about custom node attributes. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-nodeattrs.html | Elasticsearch API documentation}
      */
    nodeattrs(this: That, params?: T.CatNodeattrsRequest | TB.CatNodeattrsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatNodeattrsResponse>;
    nodeattrs(this: That, params?: T.CatNodeattrsRequest | TB.CatNodeattrsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatNodeattrsResponse, unknown>>;
    nodeattrs(this: That, params?: T.CatNodeattrsRequest | TB.CatNodeattrsRequest, options?: TransportRequestOptions): Promise<T.CatNodeattrsResponse>;
    /**
      * Returns information about the nodes in a cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-nodes.html | Elasticsearch API documentation}
      */
    nodes(this: That, params?: T.CatNodesRequest | TB.CatNodesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatNodesResponse>;
    nodes(this: That, params?: T.CatNodesRequest | TB.CatNodesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatNodesResponse, unknown>>;
    nodes(this: That, params?: T.CatNodesRequest | TB.CatNodesRequest, options?: TransportRequestOptions): Promise<T.CatNodesResponse>;
    /**
      * Returns cluster-level changes that have not yet been executed. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the pending cluster tasks API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-pending-tasks.html | Elasticsearch API documentation}
      */
    pendingTasks(this: That, params?: T.CatPendingTasksRequest | TB.CatPendingTasksRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatPendingTasksResponse>;
    pendingTasks(this: That, params?: T.CatPendingTasksRequest | TB.CatPendingTasksRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatPendingTasksResponse, unknown>>;
    pendingTasks(this: That, params?: T.CatPendingTasksRequest | TB.CatPendingTasksRequest, options?: TransportRequestOptions): Promise<T.CatPendingTasksResponse>;
    /**
      * Returns a list of plugins running on each node of a cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-plugins.html | Elasticsearch API documentation}
      */
    plugins(this: That, params?: T.CatPluginsRequest | TB.CatPluginsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatPluginsResponse>;
    plugins(this: That, params?: T.CatPluginsRequest | TB.CatPluginsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatPluginsResponse, unknown>>;
    plugins(this: That, params?: T.CatPluginsRequest | TB.CatPluginsRequest, options?: TransportRequestOptions): Promise<T.CatPluginsResponse>;
    /**
      * Returns information about ongoing and completed shard recoveries. Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or syncing a replica shard from a primary shard. When a shard recovery completes, the recovered shard is available for search and indexing. For data streams, the API returns information about the stream’s backing indices. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index recovery API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-recovery.html | Elasticsearch API documentation}
      */
    recovery(this: That, params?: T.CatRecoveryRequest | TB.CatRecoveryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatRecoveryResponse>;
    recovery(this: That, params?: T.CatRecoveryRequest | TB.CatRecoveryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatRecoveryResponse, unknown>>;
    recovery(this: That, params?: T.CatRecoveryRequest | TB.CatRecoveryRequest, options?: TransportRequestOptions): Promise<T.CatRecoveryResponse>;
    /**
      * Returns the snapshot repositories for a cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot repository API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-repositories.html | Elasticsearch API documentation}
      */
    repositories(this: That, params?: T.CatRepositoriesRequest | TB.CatRepositoriesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatRepositoriesResponse>;
    repositories(this: That, params?: T.CatRepositoriesRequest | TB.CatRepositoriesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatRepositoriesResponse, unknown>>;
    repositories(this: That, params?: T.CatRepositoriesRequest | TB.CatRepositoriesRequest, options?: TransportRequestOptions): Promise<T.CatRepositoriesResponse>;
    /**
      * Returns low-level information about the Lucene segments in index shards. For data streams, the API returns information about the backing indices. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the index segments API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-segments.html | Elasticsearch API documentation}
      */
    segments(this: That, params?: T.CatSegmentsRequest | TB.CatSegmentsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatSegmentsResponse>;
    segments(this: That, params?: T.CatSegmentsRequest | TB.CatSegmentsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatSegmentsResponse, unknown>>;
    segments(this: That, params?: T.CatSegmentsRequest | TB.CatSegmentsRequest, options?: TransportRequestOptions): Promise<T.CatSegmentsResponse>;
    /**
      * Returns information about the shards in a cluster. For data streams, the API returns information about the backing indices. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-shards.html | Elasticsearch API documentation}
      */
    shards(this: That, params?: T.CatShardsRequest | TB.CatShardsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatShardsResponse>;
    shards(this: That, params?: T.CatShardsRequest | TB.CatShardsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatShardsResponse, unknown>>;
    shards(this: That, params?: T.CatShardsRequest | TB.CatShardsRequest, options?: TransportRequestOptions): Promise<T.CatShardsResponse>;
    /**
      * Returns information about the snapshots stored in one or more repositories. A snapshot is a backup of an index or running Elasticsearch cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get snapshot API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-snapshots.html | Elasticsearch API documentation}
      */
    snapshots(this: That, params?: T.CatSnapshotsRequest | TB.CatSnapshotsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatSnapshotsResponse>;
    snapshots(this: That, params?: T.CatSnapshotsRequest | TB.CatSnapshotsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatSnapshotsResponse, unknown>>;
    snapshots(this: That, params?: T.CatSnapshotsRequest | TB.CatSnapshotsRequest, options?: TransportRequestOptions): Promise<T.CatSnapshotsResponse>;
    /**
      * Returns information about tasks currently executing in the cluster. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the task management API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/tasks.html | Elasticsearch API documentation}
      */
    tasks(this: That, params?: T.CatTasksRequest | TB.CatTasksRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatTasksResponse>;
    tasks(this: That, params?: T.CatTasksRequest | TB.CatTasksRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatTasksResponse, unknown>>;
    tasks(this: That, params?: T.CatTasksRequest | TB.CatTasksRequest, options?: TransportRequestOptions): Promise<T.CatTasksResponse>;
    /**
      * Returns information about index templates in a cluster. You can use index templates to apply index settings and field mappings to new indices at creation. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the get index template API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-templates.html | Elasticsearch API documentation}
      */
    templates(this: That, params?: T.CatTemplatesRequest | TB.CatTemplatesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatTemplatesResponse>;
    templates(this: That, params?: T.CatTemplatesRequest | TB.CatTemplatesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatTemplatesResponse, unknown>>;
    templates(this: That, params?: T.CatTemplatesRequest | TB.CatTemplatesRequest, options?: TransportRequestOptions): Promise<T.CatTemplatesResponse>;
    /**
      * Returns thread pool statistics for each node in a cluster. Returned information includes all built-in thread pools and custom thread pools. IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the nodes info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-thread-pool.html | Elasticsearch API documentation}
      */
    threadPool(this: That, params?: T.CatThreadPoolRequest | TB.CatThreadPoolRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatThreadPoolResponse>;
    threadPool(this: That, params?: T.CatThreadPoolRequest | TB.CatThreadPoolRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatThreadPoolResponse, unknown>>;
    threadPool(this: That, params?: T.CatThreadPoolRequest | TB.CatThreadPoolRequest, options?: TransportRequestOptions): Promise<T.CatThreadPoolResponse>;
    /**
      * Returns configuration and usage information about transforms. IMPORTANT: cat APIs are only intended for human consumption using the Kibana console or command line. They are not intended for use by applications. For application consumption, use the get transform statistics API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cat-transforms.html | Elasticsearch API documentation}
      */
    transforms(this: That, params?: T.CatTransformsRequest | TB.CatTransformsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CatTransformsResponse>;
    transforms(this: That, params?: T.CatTransformsRequest | TB.CatTransformsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CatTransformsResponse, unknown>>;
    transforms(this: That, params?: T.CatTransformsRequest | TB.CatTransformsRequest, options?: TransportRequestOptions): Promise<T.CatTransformsResponse>;
}
export {};
