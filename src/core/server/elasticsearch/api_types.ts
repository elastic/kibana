/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  Client,
  GenericParams,
  // root params
  BulkIndexDocumentsParams,
  ClearScrollParams,
  CountParams,
  CreateDocumentParams,
  DeleteDocumentParams,
  DeleteDocumentByQueryParams,
  DeleteScriptParams,
  DeleteTemplateParams,
  ExistsParams,
  ExplainParams,
  FieldStatsParams,
  GetParams,
  GetResponse,
  GetScriptParams,
  GetSourceParams,
  GetTemplateParams,
  IndexDocumentParams,
  InfoParams,
  MGetParams,
  MSearchParams,
  MSearchTemplateParams,
  MTermVectorsParams,
  PingParams,
  PutScriptParams,
  PutTemplateParams,
  ReindexParams,
  ReindexRethrottleParams,
  RenderSearchTemplateParams,
  ScrollParams,
  SearchParams,
  SearchShardsParams,
  SearchTemplateParams,
  SuggestParams,
  TermvectorsParams,
  UpdateDocumentParams,
  UpdateDocumentByQueryParams,
  MGetResponse,
  MSearchResponse,
  SearchResponse,
  // cat
  CatAliasesParams,
  CatAllocationParams,
  CatFielddataParams,
  CatHealthParams,
  CatHelpParams,
  CatIndicesParams,
  CatCommonParams,
  CatRecoveryParams,
  CatSegmentsParams,
  CatShardsParams,
  CatSnapshotsParams,
  CatTasksParams,
  CatThreadPoolParams,
  // cluster
  ClusterAllocationExplainParams,
  ClusterGetSettingsParams,
  ClusterHealthParams,
  ClusterPendingTasksParams,
  ClusterPutSettingsParams,
  ClusterRerouteParams,
  ClusterStateParams,
  ClusterStatsParams,
  // indices
  IndicesAnalyzeParams,
  IndicesClearCacheParams,
  IndicesCloseParams,
  IndicesCreateParams,
  IndicesDeleteParams,
  IndicesDeleteAliasParams,
  IndicesDeleteTemplateParams,
  IndicesExistsParams,
  IndicesExistsAliasParams,
  IndicesExistsTemplateParams,
  IndicesExistsTypeParams,
  IndicesFlushParams,
  IndicesFlushSyncedParams,
  IndicesForcemergeParams,
  IndicesGetParams,
  IndicesGetAliasParams,
  IndicesGetFieldMappingParams,
  IndicesGetMappingParams,
  IndicesGetSettingsParams,
  IndicesGetTemplateParams,
  IndicesGetUpgradeParams,
  IndicesOpenParams,
  IndicesPutAliasParams,
  IndicesPutMappingParams,
  IndicesPutSettingsParams,
  IndicesPutTemplateParams,
  IndicesRecoveryParams,
  IndicesRefreshParams,
  IndicesRolloverParams,
  IndicesSegmentsParams,
  IndicesShardStoresParams,
  IndicesShrinkParams,
  IndicesStatsParams,
  IndicesUpdateAliasesParams,
  IndicesUpgradeParams,
  IndicesValidateQueryParams,
  // ingest
  IngestDeletePipelineParams,
  IngestGetPipelineParams,
  IngestPutPipelineParams,
  IngestSimulateParams,
  // nodes
  NodesHotThreadsParams,
  NodesInfoParams,
  NodesStatsParams,
  // snapshot
  SnapshotCreateParams,
  SnapshotCreateRepositoryParams,
  SnapshotDeleteParams,
  SnapshotDeleteRepositoryParams,
  SnapshotGetParams,
  SnapshotGetRepositoryParams,
  SnapshotRestoreParams,
  SnapshotStatusParams,
  SnapshotVerifyRepositoryParams,
  // tasks
  TasksCancelParams,
  TasksGetParams,
  TasksListParams,
  SnapshotCleanupRepositoryParams,
} from 'elasticsearch';

/**
 * The set of options that defines how API call should be made and result be
 * processed.
 *
 * @public
 */
export interface CallAPIOptions {
  /**
   * Indicates whether `401 Unauthorized` errors returned from the Elasticsearch API
   * should be wrapped into `Boom` error instances with properly set `WWW-Authenticate`
   * header that could have been returned by the API itself. If API didn't specify that
   * then `Basic realm="Authorization Required"` is used as `WWW-Authenticate`.
   */
  wrap401Errors?: boolean;
  /**
   * A signal object that allows you to abort the request via an AbortController object.
   */
  signal?: AbortSignal;
}

/** @public */
export interface APICaller {
  /* eslint-disable */
  (endpoint: 'bulk', params: BulkIndexDocumentsParams, options?: CallAPIOptions): ReturnType<Client['bulk']>;
  (endpoint: 'clearScroll', params: ClearScrollParams, options?: CallAPIOptions): ReturnType<Client['clearScroll']>;
  (endpoint: 'count', params: CountParams, options?: CallAPIOptions): ReturnType<Client['count']>;
  (endpoint: 'create', params: CreateDocumentParams, options?: CallAPIOptions): ReturnType<Client['create']>;
  (endpoint: 'delete', params: DeleteDocumentParams, options?: CallAPIOptions): ReturnType<Client['delete']>;
  (endpoint: 'deleteByQuery', params: DeleteDocumentByQueryParams, options?: CallAPIOptions): ReturnType<Client['deleteByQuery']>;
  (endpoint: 'deleteScript', params: DeleteScriptParams, options?: CallAPIOptions): ReturnType<Client['deleteScript']>;
  (endpoint: 'deleteTemplate', params: DeleteTemplateParams, options?: CallAPIOptions): ReturnType<Client['deleteTemplate']>;
  (endpoint: 'exists', params: ExistsParams, options?: CallAPIOptions): ReturnType<Client['exists']>;
  (endpoint: 'explain', params: ExplainParams, options?: CallAPIOptions): ReturnType<Client['explain']>;
  (endpoint: 'fieldStats', params: FieldStatsParams, options?: CallAPIOptions): ReturnType<Client['fieldStats']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'get', params: GetParams, options?: CallAPIOptions): Promise<GetResponse<T>>;
  (endpoint: 'getScript', params: GetScriptParams, options?: CallAPIOptions): ReturnType<Client['getScript']>;
  (endpoint: 'getSource', params: GetSourceParams, options?: CallAPIOptions): ReturnType<Client['getSource']>;
  (endpoint: 'getTemplate', params: GetTemplateParams, options?: CallAPIOptions): ReturnType<Client['getTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'index', params: IndexDocumentParams<T>, options?: CallAPIOptions): ReturnType<Client['index']>;
  (endpoint: 'info', params: InfoParams, options?: CallAPIOptions): ReturnType<Client['info']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'mget', params: MGetParams, options?: CallAPIOptions): Promise<MGetResponse<T>>;
  <T>(endpoint: 'msearch', params: MSearchParams, options?: CallAPIOptions): Promise<MSearchResponse<T>>;
  <T>(endpoint: 'msearchTemplate', params: MSearchTemplateParams, options?: CallAPIOptions): Promise<MSearchResponse<T>>;
  (endpoint: 'mtermvectors', params: MTermVectorsParams, options?: CallAPIOptions): ReturnType<Client['mtermvectors']>;
  (endpoint: 'ping', params: PingParams, options?: CallAPIOptions): ReturnType<Client['ping']>;
  (endpoint: 'putScript', params: PutScriptParams, options?: CallAPIOptions): ReturnType<Client['putScript']>;
  (endpoint: 'putTemplate', params: PutTemplateParams, options?: CallAPIOptions): ReturnType<Client['putTemplate']>;
  (endpoint: 'reindex', params: ReindexParams, options?: CallAPIOptions): ReturnType<Client['reindex']>;
  (endpoint: 'reindexRethrottle', params: ReindexRethrottleParams, options?: CallAPIOptions): ReturnType<Client['reindexRethrottle']>;
  (endpoint: 'renderSearchTemplate', params: RenderSearchTemplateParams, options?: CallAPIOptions): ReturnType<Client['renderSearchTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'scroll', params: ScrollParams, options?: CallAPIOptions): Promise<SearchResponse<T>>;
  <T>(endpoint: 'search', params: SearchParams, options?: CallAPIOptions): Promise<SearchResponse<T>>;
  (endpoint: 'searchShards', params: SearchShardsParams, options?: CallAPIOptions): ReturnType<Client['searchShards']>;
  (endpoint: 'searchTemplate', params: SearchTemplateParams, options?: CallAPIOptions): ReturnType<Client['searchTemplate']>;
  (endpoint: 'suggest', params: SuggestParams, options?: CallAPIOptions): ReturnType<Client['suggest']>;
  (endpoint: 'termvectors', params: TermvectorsParams, options?: CallAPIOptions): ReturnType<Client['termvectors']>;
  (endpoint: 'update', params: UpdateDocumentParams, options?: CallAPIOptions): ReturnType<Client['update']>;
  (endpoint: 'updateByQuery', params: UpdateDocumentByQueryParams, options?: CallAPIOptions): ReturnType<Client['updateByQuery']>;

  // cat namespace
  (endpoint: 'cat.aliases', params: CatAliasesParams, options?: CallAPIOptions): ReturnType<Client['cat']['aliases']>;
  (endpoint: 'cat.allocation', params: CatAllocationParams, options?: CallAPIOptions): ReturnType<Client['cat']['allocation']>;
  (endpoint: 'cat.count', params: CatAllocationParams, options?: CallAPIOptions): ReturnType<Client['cat']['count']>;
  (endpoint: 'cat.fielddata', params: CatFielddataParams, options?: CallAPIOptions): ReturnType<Client['cat']['fielddata']>;
  (endpoint: 'cat.health', params: CatHealthParams, options?: CallAPIOptions): ReturnType<Client['cat']['health']>;
  (endpoint: 'cat.help', params: CatHelpParams, options?: CallAPIOptions): ReturnType<Client['cat']['help']>;
  (endpoint: 'cat.indices', params: CatIndicesParams, options?: CallAPIOptions): ReturnType<Client['cat']['indices']>;
  (endpoint: 'cat.master', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['master']>;
  (endpoint: 'cat.nodeattrs', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['nodeattrs']>;
  (endpoint: 'cat.nodes', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['nodes']>;
  (endpoint: 'cat.pendingTasks', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['pendingTasks']>;
  (endpoint: 'cat.plugins', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['plugins']>;
  (endpoint: 'cat.recovery', params: CatRecoveryParams, options?: CallAPIOptions): ReturnType<Client['cat']['recovery']>;
  (endpoint: 'cat.repositories', params: CatCommonParams, options?: CallAPIOptions): ReturnType<Client['cat']['repositories']>;
  (endpoint: 'cat.segments', params: CatSegmentsParams, options?: CallAPIOptions): ReturnType<Client['cat']['segments']>;
  (endpoint: 'cat.shards', params: CatShardsParams, options?: CallAPIOptions): ReturnType<Client['cat']['shards']>;
  (endpoint: 'cat.snapshots', params: CatSnapshotsParams, options?: CallAPIOptions): ReturnType<Client['cat']['snapshots']>;
  (endpoint: 'cat.tasks', params: CatTasksParams, options?: CallAPIOptions): ReturnType<Client['cat']['tasks']>;
  (endpoint: 'cat.threadPool', params: CatThreadPoolParams, options?: CallAPIOptions): ReturnType<Client['cat']['threadPool']>;

  // cluster namespace
  (endpoint: 'cluster.allocationExplain', params: ClusterAllocationExplainParams, options?: CallAPIOptions): ReturnType<Client['cluster']['allocationExplain']>;
  (endpoint: 'cluster.getSettings', params: ClusterGetSettingsParams, options?: CallAPIOptions): ReturnType<Client['cluster']['getSettings']>;
  (endpoint: 'cluster.health', params: ClusterHealthParams, options?: CallAPIOptions): ReturnType<Client['cluster']['health']>;
  (endpoint: 'cluster.pendingTasks', params: ClusterPendingTasksParams, options?: CallAPIOptions): ReturnType<Client['cluster']['pendingTasks']>;
  (endpoint: 'cluster.putSettings', params: ClusterPutSettingsParams, options?: CallAPIOptions): ReturnType<Client['cluster']['putSettings']>;
  (endpoint: 'cluster.reroute', params: ClusterRerouteParams, options?: CallAPIOptions): ReturnType<Client['cluster']['reroute']>;
  (endpoint: 'cluster.state', params: ClusterStateParams, options?: CallAPIOptions): ReturnType<Client['cluster']['state']>;
  (endpoint: 'cluster.stats', params: ClusterStatsParams, options?: CallAPIOptions): ReturnType<Client['cluster']['stats']>;

  // indices namespace
  (endpoint: 'indices.analyze', params: IndicesAnalyzeParams, options?: CallAPIOptions): ReturnType<Client['indices']['analyze']>;
  (endpoint: 'indices.clearCache', params: IndicesClearCacheParams, options?: CallAPIOptions): ReturnType<Client['indices']['clearCache']>;
  (endpoint: 'indices.close', params: IndicesCloseParams, options?: CallAPIOptions): ReturnType<Client['indices']['close']>;
  (endpoint: 'indices.create', params: IndicesCreateParams, options?: CallAPIOptions): ReturnType<Client['indices']['create']>;
  (endpoint: 'indices.delete', params: IndicesDeleteParams, options?: CallAPIOptions): ReturnType<Client['indices']['delete']>;
  (endpoint: 'indices.deleteAlias', params: IndicesDeleteAliasParams, options?: CallAPIOptions): ReturnType<Client['indices']['deleteAlias']>;
  (endpoint: 'indices.deleteTemplate', params: IndicesDeleteTemplateParams, options?: CallAPIOptions): ReturnType<Client['indices']['deleteTemplate']>;
  (endpoint: 'indices.exists', params: IndicesExistsParams, options?: CallAPIOptions): ReturnType<Client['indices']['exists']>;
  (endpoint: 'indices.existsAlias', params: IndicesExistsAliasParams, options?: CallAPIOptions): ReturnType<Client['indices']['existsAlias']>;
  (endpoint: 'indices.existsTemplate', params: IndicesExistsTemplateParams, options?: CallAPIOptions): ReturnType<Client['indices']['existsTemplate']>;
  (endpoint: 'indices.existsType', params: IndicesExistsTypeParams, options?: CallAPIOptions): ReturnType<Client['indices']['existsType']>;
  (endpoint: 'indices.flush', params: IndicesFlushParams, options?: CallAPIOptions): ReturnType<Client['indices']['flush']>;
  (endpoint: 'indices.flushSynced', params: IndicesFlushSyncedParams, options?: CallAPIOptions): ReturnType<Client['indices']['flushSynced']>;
  (endpoint: 'indices.forcemerge', params: IndicesForcemergeParams, options?: CallAPIOptions): ReturnType<Client['indices']['forcemerge']>;
  (endpoint: 'indices.get', params: IndicesGetParams, options?: CallAPIOptions): ReturnType<Client['indices']['get']>;
  (endpoint: 'indices.getAlias', params: IndicesGetAliasParams, options?: CallAPIOptions): ReturnType<Client['indices']['getAlias']>;
  (endpoint: 'indices.getFieldMapping', params: IndicesGetFieldMappingParams, options?: CallAPIOptions): ReturnType<Client['indices']['getFieldMapping']>;
  (endpoint: 'indices.getMapping', params: IndicesGetMappingParams, options?: CallAPIOptions): ReturnType<Client['indices']['getMapping']>;
  (endpoint: 'indices.getSettings', params: IndicesGetSettingsParams, options?: CallAPIOptions): ReturnType<Client['indices']['getSettings']>;
  (endpoint: 'indices.getTemplate', params: IndicesGetTemplateParams, options?: CallAPIOptions): ReturnType<Client['indices']['getTemplate']>;
  (endpoint: 'indices.getUpgrade', params: IndicesGetUpgradeParams, options?: CallAPIOptions): ReturnType<Client['indices']['getUpgrade']>;
  (endpoint: 'indices.open', params: IndicesOpenParams, options?: CallAPIOptions): ReturnType<Client['indices']['open']>;
  (endpoint: 'indices.putAlias', params: IndicesPutAliasParams, options?: CallAPIOptions): ReturnType<Client['indices']['putAlias']>;
  (endpoint: 'indices.putMapping', params: IndicesPutMappingParams, options?: CallAPIOptions): ReturnType<Client['indices']['putMapping']>;
  (endpoint: 'indices.putSettings', params: IndicesPutSettingsParams, options?: CallAPIOptions): ReturnType<Client['indices']['putSettings']>;
  (endpoint: 'indices.putTemplate', params: IndicesPutTemplateParams, options?: CallAPIOptions): ReturnType<Client['indices']['putTemplate']>;
  (endpoint: 'indices.recovery', params: IndicesRecoveryParams, options?: CallAPIOptions): ReturnType<Client['indices']['recovery']>;
  (endpoint: 'indices.refresh', params: IndicesRefreshParams, options?: CallAPIOptions): ReturnType<Client['indices']['refresh']>;
  (endpoint: 'indices.rollover', params: IndicesRolloverParams, options?: CallAPIOptions): ReturnType<Client['indices']['rollover']>;
  (endpoint: 'indices.segments', params: IndicesSegmentsParams, options?: CallAPIOptions): ReturnType<Client['indices']['segments']>;
  (endpoint: 'indices.shardStores', params: IndicesShardStoresParams, options?: CallAPIOptions): ReturnType<Client['indices']['shardStores']>;
  (endpoint: 'indices.shrink', params: IndicesShrinkParams, options?: CallAPIOptions): ReturnType<Client['indices']['shrink']>;
  (endpoint: 'indices.stats', params: IndicesStatsParams, options?: CallAPIOptions): ReturnType<Client['indices']['stats']>;
  (endpoint: 'indices.updateAliases', params: IndicesUpdateAliasesParams, options?: CallAPIOptions): ReturnType<Client['indices']['updateAliases']>;
  (endpoint: 'indices.upgrade', params: IndicesUpgradeParams, options?: CallAPIOptions): ReturnType<Client['indices']['upgrade']>;
  (endpoint: 'indices.validateQuery', params: IndicesValidateQueryParams, options?: CallAPIOptions): ReturnType<Client['indices']['validateQuery']>;

  // ingest namepsace
  (endpoint: 'ingest.deletePipeline', params: IngestDeletePipelineParams, options?: CallAPIOptions): ReturnType<Client['ingest']['deletePipeline']>;
  (endpoint: 'ingest.getPipeline', params: IngestGetPipelineParams, options?: CallAPIOptions): ReturnType<Client['ingest']['getPipeline']>;
  (endpoint: 'ingest.putPipeline', params: IngestPutPipelineParams, options?: CallAPIOptions): ReturnType<Client['ingest']['putPipeline']>;
  (endpoint: 'ingest.simulate', params: IngestSimulateParams, options?: CallAPIOptions): ReturnType<Client['ingest']['simulate']>;

  // nodes namespace
  (endpoint: 'nodes.hotThreads', params: NodesHotThreadsParams, options?: CallAPIOptions): ReturnType<Client['nodes']['hotThreads']>;
  (endpoint: 'nodes.info', params: NodesInfoParams, options?: CallAPIOptions): ReturnType<Client['nodes']['info']>;
  (endpoint: 'nodes.stats', params: NodesStatsParams, options?: CallAPIOptions): ReturnType<Client['nodes']['stats']>;

  // snapshot namespace
  (endpoint: 'snapshot.create', params: SnapshotCreateParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['create']>;
  (endpoint: 'snapshot.createRepository', params: SnapshotCreateRepositoryParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['createRepository']>;
  (endpoint: 'snapshot.delete', params: SnapshotDeleteParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['delete']>;
  (endpoint: 'snapshot.deleteRepository', params: SnapshotDeleteRepositoryParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['deleteRepository']>;
  (endpoint: 'snapshot.get', params: SnapshotGetParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['get']>;
  (endpoint: 'snapshot.getRepository', params: SnapshotGetRepositoryParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['getRepository']>;
  (endpoint: 'snapshot.restore', params: SnapshotRestoreParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['restore']>;
  (endpoint: 'snapshot.status', params: SnapshotStatusParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['status']>;
  (endpoint: 'snapshot.verifyRepository', params: SnapshotVerifyRepositoryParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['verifyRepository']>;
  (endpoint: 'snapshot.cleanupRepository', params: SnapshotCleanupRepositoryParams, options?: CallAPIOptions): ReturnType<Client['snapshot']['cleanupRepository']>;

  // tasks namespace
  (endpoint: 'tasks.cancel', params: TasksCancelParams, options?: CallAPIOptions): ReturnType<Client['tasks']['cancel']>;
  (endpoint: 'tasks.get', params: TasksGetParams, options?: CallAPIOptions): ReturnType<Client['tasks']['get']>;
  (endpoint: 'tasks.list', params: TasksListParams, options?: CallAPIOptions): ReturnType<Client['tasks']['list']>;

  // other APIs accessed via transport.request
  (endpoint: 'transport.request', clientParams: AssistantAPIClientParams, options?: CallAPIOptions): Promise<
    AssistanceAPIResponse
  >;
  (endpoint: 'transport.request', clientParams: DeprecationAPIClientParams, options?: CallAPIOptions): Promise<
    DeprecationAPIResponse
  >;

  // Catch-all definition
  <T = any>(endpoint: string, clientParams?: Record<string, any>, options?: CallAPIOptions): Promise<T>;
  /* eslint-enable */
}

/** @public */
export interface AssistantAPIClientParams extends GenericParams {
  path: '/_migration/assistance';
  method: 'GET';
}

/** @public */
export type MIGRATION_ASSISTANCE_INDEX_ACTION = 'upgrade' | 'reindex';
/** @public */
export type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';

/** @public */
export interface AssistanceAPIResponse {
  indices: {
    [indexName: string]: {
      action_required: MIGRATION_ASSISTANCE_INDEX_ACTION;
    };
  };
}

/** @public */
export interface DeprecationAPIClientParams extends GenericParams {
  path: '/_migration/deprecations';
  method: 'GET';
}

/** @public */
export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

/** @public */
export interface IndexSettingsDeprecationInfo {
  [indexName: string]: DeprecationInfo[];
}

/** @public */
export interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  ml_settings: DeprecationInfo[];
  node_settings: DeprecationInfo[];
  index_settings: IndexSettingsDeprecationInfo;
}
