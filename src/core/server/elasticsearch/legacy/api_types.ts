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
} from 'elasticsearch';

/**
 * The set of options that defines how API call should be made and result be
 * processed.
 *
 * @public
 */
export interface LegacyCallAPIOptions {
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
export interface LegacyAPICaller {
  /* eslint-disable */
  (endpoint: 'bulk', params: BulkIndexDocumentsParams, options?: LegacyCallAPIOptions): ReturnType<Client['bulk']>;
  (endpoint: 'clearScroll', params: ClearScrollParams, options?: LegacyCallAPIOptions): ReturnType<Client['clearScroll']>;
  (endpoint: 'count', params: CountParams, options?: LegacyCallAPIOptions): ReturnType<Client['count']>;
  (endpoint: 'create', params: CreateDocumentParams, options?: LegacyCallAPIOptions): ReturnType<Client['create']>;
  (endpoint: 'delete', params: DeleteDocumentParams, options?: LegacyCallAPIOptions): ReturnType<Client['delete']>;
  (endpoint: 'deleteByQuery', params: DeleteDocumentByQueryParams, options?: LegacyCallAPIOptions): ReturnType<Client['deleteByQuery']>;
  (endpoint: 'deleteScript', params: DeleteScriptParams, options?: LegacyCallAPIOptions): ReturnType<Client['deleteScript']>;
  (endpoint: 'deleteTemplate', params: DeleteTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['deleteTemplate']>;
  (endpoint: 'exists', params: ExistsParams, options?: LegacyCallAPIOptions): ReturnType<Client['exists']>;
  (endpoint: 'explain', params: ExplainParams, options?: LegacyCallAPIOptions): ReturnType<Client['explain']>;
  (endpoint: 'fieldStats', params: FieldStatsParams, options?: LegacyCallAPIOptions): ReturnType<Client['fieldStats']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'get', params: GetParams, options?: LegacyCallAPIOptions): Promise<GetResponse<T>>;
  (endpoint: 'getScript', params: GetScriptParams, options?: LegacyCallAPIOptions): ReturnType<Client['getScript']>;
  (endpoint: 'getSource', params: GetSourceParams, options?: LegacyCallAPIOptions): ReturnType<Client['getSource']>;
  (endpoint: 'getTemplate', params: GetTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['getTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'index', params: IndexDocumentParams<T>, options?: LegacyCallAPIOptions): ReturnType<Client['index']>;
  (endpoint: 'info', params: InfoParams, options?: LegacyCallAPIOptions): ReturnType<Client['info']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'mget', params: MGetParams, options?: LegacyCallAPIOptions): Promise<MGetResponse<T>>;
  <T>(endpoint: 'msearch', params: MSearchParams, options?: LegacyCallAPIOptions): Promise<MSearchResponse<T>>;
  <T>(endpoint: 'msearchTemplate', params: MSearchTemplateParams, options?: LegacyCallAPIOptions): Promise<MSearchResponse<T>>;
  (endpoint: 'mtermvectors', params: MTermVectorsParams, options?: LegacyCallAPIOptions): ReturnType<Client['mtermvectors']>;
  (endpoint: 'ping', params: PingParams, options?: LegacyCallAPIOptions): ReturnType<Client['ping']>;
  (endpoint: 'putScript', params: PutScriptParams, options?: LegacyCallAPIOptions): ReturnType<Client['putScript']>;
  (endpoint: 'putTemplate', params: PutTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['putTemplate']>;
  (endpoint: 'reindex', params: ReindexParams, options?: LegacyCallAPIOptions): ReturnType<Client['reindex']>;
  (endpoint: 'reindexRethrottle', params: ReindexRethrottleParams, options?: LegacyCallAPIOptions): ReturnType<Client['reindexRethrottle']>;
  (endpoint: 'renderSearchTemplate', params: RenderSearchTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['renderSearchTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'scroll', params: ScrollParams, options?: LegacyCallAPIOptions): Promise<SearchResponse<T>>;
  <T>(endpoint: 'search', params: SearchParams, options?: LegacyCallAPIOptions): Promise<SearchResponse<T>>;
  (endpoint: 'searchShards', params: SearchShardsParams, options?: LegacyCallAPIOptions): ReturnType<Client['searchShards']>;
  (endpoint: 'searchTemplate', params: SearchTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['searchTemplate']>;
  (endpoint: 'suggest', params: SuggestParams, options?: LegacyCallAPIOptions): ReturnType<Client['suggest']>;
  (endpoint: 'termvectors', params: TermvectorsParams, options?: LegacyCallAPIOptions): ReturnType<Client['termvectors']>;
  (endpoint: 'update', params: UpdateDocumentParams, options?: LegacyCallAPIOptions): ReturnType<Client['update']>;
  (endpoint: 'updateByQuery', params: UpdateDocumentByQueryParams, options?: LegacyCallAPIOptions): ReturnType<Client['updateByQuery']>;

  // cat namespace
  (endpoint: 'cat.aliases', params: CatAliasesParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['aliases']>;
  (endpoint: 'cat.allocation', params: CatAllocationParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['allocation']>;
  (endpoint: 'cat.count', params: CatAllocationParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['count']>;
  (endpoint: 'cat.fielddata', params: CatFielddataParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['fielddata']>;
  (endpoint: 'cat.health', params: CatHealthParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['health']>;
  (endpoint: 'cat.help', params: CatHelpParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['help']>;
  (endpoint: 'cat.indices', params: CatIndicesParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['indices']>;
  (endpoint: 'cat.master', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['master']>;
  (endpoint: 'cat.nodeattrs', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['nodeattrs']>;
  (endpoint: 'cat.nodes', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['nodes']>;
  (endpoint: 'cat.pendingTasks', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['pendingTasks']>;
  (endpoint: 'cat.plugins', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['plugins']>;
  (endpoint: 'cat.recovery', params: CatRecoveryParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['recovery']>;
  (endpoint: 'cat.repositories', params: CatCommonParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['repositories']>;
  (endpoint: 'cat.segments', params: CatSegmentsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['segments']>;
  (endpoint: 'cat.shards', params: CatShardsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['shards']>;
  (endpoint: 'cat.snapshots', params: CatSnapshotsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['snapshots']>;
  (endpoint: 'cat.tasks', params: CatTasksParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['tasks']>;
  (endpoint: 'cat.threadPool', params: CatThreadPoolParams, options?: LegacyCallAPIOptions): ReturnType<Client['cat']['threadPool']>;

  // cluster namespace
  (endpoint: 'cluster.allocationExplain', params: ClusterAllocationExplainParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['allocationExplain']>;
  (endpoint: 'cluster.getSettings', params: ClusterGetSettingsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['getSettings']>;
  (endpoint: 'cluster.health', params: ClusterHealthParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['health']>;
  (endpoint: 'cluster.pendingTasks', params: ClusterPendingTasksParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['pendingTasks']>;
  (endpoint: 'cluster.putSettings', params: ClusterPutSettingsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['putSettings']>;
  (endpoint: 'cluster.reroute', params: ClusterRerouteParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['reroute']>;
  (endpoint: 'cluster.state', params: ClusterStateParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['state']>;
  (endpoint: 'cluster.stats', params: ClusterStatsParams, options?: LegacyCallAPIOptions): ReturnType<Client['cluster']['stats']>;

  // indices namespace
  (endpoint: 'indices.analyze', params: IndicesAnalyzeParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['analyze']>;
  (endpoint: 'indices.clearCache', params: IndicesClearCacheParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['clearCache']>;
  (endpoint: 'indices.close', params: IndicesCloseParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['close']>;
  (endpoint: 'indices.create', params: IndicesCreateParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['create']>;
  (endpoint: 'indices.delete', params: IndicesDeleteParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['delete']>;
  (endpoint: 'indices.deleteAlias', params: IndicesDeleteAliasParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['deleteAlias']>;
  (endpoint: 'indices.deleteTemplate', params: IndicesDeleteTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['deleteTemplate']>;
  (endpoint: 'indices.exists', params: IndicesExistsParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['exists']>;
  (endpoint: 'indices.existsAlias', params: IndicesExistsAliasParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['existsAlias']>;
  (endpoint: 'indices.existsTemplate', params: IndicesExistsTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['existsTemplate']>;
  (endpoint: 'indices.existsType', params: IndicesExistsTypeParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['existsType']>;
  (endpoint: 'indices.flush', params: IndicesFlushParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['flush']>;
  (endpoint: 'indices.flushSynced', params: IndicesFlushSyncedParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['flushSynced']>;
  (endpoint: 'indices.forcemerge', params: IndicesForcemergeParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['forcemerge']>;
  (endpoint: 'indices.get', params: IndicesGetParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['get']>;
  (endpoint: 'indices.getAlias', params: IndicesGetAliasParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getAlias']>;
  (endpoint: 'indices.getFieldMapping', params: IndicesGetFieldMappingParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getFieldMapping']>;
  (endpoint: 'indices.getMapping', params: IndicesGetMappingParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getMapping']>;
  (endpoint: 'indices.getSettings', params: IndicesGetSettingsParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getSettings']>;
  (endpoint: 'indices.getTemplate', params: IndicesGetTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getTemplate']>;
  (endpoint: 'indices.getUpgrade', params: IndicesGetUpgradeParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['getUpgrade']>;
  (endpoint: 'indices.open', params: IndicesOpenParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['open']>;
  (endpoint: 'indices.putAlias', params: IndicesPutAliasParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['putAlias']>;
  (endpoint: 'indices.putMapping', params: IndicesPutMappingParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['putMapping']>;
  (endpoint: 'indices.putSettings', params: IndicesPutSettingsParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['putSettings']>;
  (endpoint: 'indices.putTemplate', params: IndicesPutTemplateParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['putTemplate']>;
  (endpoint: 'indices.recovery', params: IndicesRecoveryParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['recovery']>;
  (endpoint: 'indices.refresh', params: IndicesRefreshParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['refresh']>;
  (endpoint: 'indices.rollover', params: IndicesRolloverParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['rollover']>;
  (endpoint: 'indices.segments', params: IndicesSegmentsParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['segments']>;
  (endpoint: 'indices.shardStores', params: IndicesShardStoresParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['shardStores']>;
  (endpoint: 'indices.shrink', params: IndicesShrinkParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['shrink']>;
  (endpoint: 'indices.stats', params: IndicesStatsParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['stats']>;
  (endpoint: 'indices.updateAliases', params: IndicesUpdateAliasesParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['updateAliases']>;
  (endpoint: 'indices.upgrade', params: IndicesUpgradeParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['upgrade']>;
  (endpoint: 'indices.validateQuery', params: IndicesValidateQueryParams, options?: LegacyCallAPIOptions): ReturnType<Client['indices']['validateQuery']>;

  // ingest namepsace
  (endpoint: 'ingest.deletePipeline', params: IngestDeletePipelineParams, options?: LegacyCallAPIOptions): ReturnType<Client['ingest']['deletePipeline']>;
  (endpoint: 'ingest.getPipeline', params: IngestGetPipelineParams, options?: LegacyCallAPIOptions): ReturnType<Client['ingest']['getPipeline']>;
  (endpoint: 'ingest.putPipeline', params: IngestPutPipelineParams, options?: LegacyCallAPIOptions): ReturnType<Client['ingest']['putPipeline']>;
  (endpoint: 'ingest.simulate', params: IngestSimulateParams, options?: LegacyCallAPIOptions): ReturnType<Client['ingest']['simulate']>;

  // nodes namespace
  (endpoint: 'nodes.hotThreads', params: NodesHotThreadsParams, options?: LegacyCallAPIOptions): ReturnType<Client['nodes']['hotThreads']>;
  (endpoint: 'nodes.info', params: NodesInfoParams, options?: LegacyCallAPIOptions): ReturnType<Client['nodes']['info']>;
  (endpoint: 'nodes.stats', params: NodesStatsParams, options?: LegacyCallAPIOptions): ReturnType<Client['nodes']['stats']>;

  // snapshot namespace
  (endpoint: 'snapshot.create', params: SnapshotCreateParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['create']>;
  (endpoint: 'snapshot.createRepository', params: SnapshotCreateRepositoryParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['createRepository']>;
  (endpoint: 'snapshot.delete', params: SnapshotDeleteParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['delete']>;
  (endpoint: 'snapshot.deleteRepository', params: SnapshotDeleteRepositoryParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['deleteRepository']>;
  (endpoint: 'snapshot.get', params: SnapshotGetParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['get']>;
  (endpoint: 'snapshot.getRepository', params: SnapshotGetRepositoryParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['getRepository']>;
  (endpoint: 'snapshot.restore', params: SnapshotRestoreParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['restore']>;
  (endpoint: 'snapshot.status', params: SnapshotStatusParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['status']>;
  (endpoint: 'snapshot.verifyRepository', params: SnapshotVerifyRepositoryParams, options?: LegacyCallAPIOptions): ReturnType<Client['snapshot']['verifyRepository']>;

  // tasks namespace
  (endpoint: 'tasks.cancel', params: TasksCancelParams, options?: LegacyCallAPIOptions): ReturnType<Client['tasks']['cancel']>;
  (endpoint: 'tasks.get', params: TasksGetParams, options?: LegacyCallAPIOptions): ReturnType<Client['tasks']['get']>;
  (endpoint: 'tasks.list', params: TasksListParams, options?: LegacyCallAPIOptions): ReturnType<Client['tasks']['list']>;

  // other APIs accessed via transport.request
  (endpoint: 'transport.request', clientParams: AssistantAPIClientParams, options?: LegacyCallAPIOptions): Promise<
    AssistanceAPIResponse
  >;
  (endpoint: 'transport.request', clientParams: DeprecationAPIClientParams, options?: LegacyCallAPIOptions): Promise<
    DeprecationAPIResponse
  >;

  // Catch-all definition
  <T = any>(endpoint: string, clientParams?: Record<string, any>, options?: LegacyCallAPIOptions): Promise<T>;
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
