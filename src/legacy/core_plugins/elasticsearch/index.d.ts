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
  Client as ESClient,
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

export class Cluster {
  public callWithRequest: CallClusterWithRequest;
  public callWithInternalUser: CallCluster;
  constructor(config: ClusterConfig);
}

export interface ClusterConfig {
  [option: string]: any;
}

export interface Request {
  headers: RequestHeaders;
}

interface RequestHeaders {
  [name: string]: string;
}

interface AssistantAPIClientParams extends GenericParams {
  path: '/_migration/assistance';
  method: 'GET';
}

type MIGRATION_ASSISTANCE_INDEX_ACTION = 'upgrade' | 'reindex';
type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';

export interface AssistanceAPIResponse {
  indices: {
    [indexName: string]: {
      action_required: MIGRATION_ASSISTANCE_INDEX_ACTION;
    };
  };
}

interface DeprecationAPIClientParams extends GenericParams {
  path: '/_migration/deprecations';
  method: 'GET';
}

export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

export interface IndexSettingsDeprecationInfo {
  [indexName: string]: DeprecationInfo[];
}

export interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  ml_settings: DeprecationInfo[];
  node_settings: DeprecationInfo[];
  index_settings: IndexSettingsDeprecationInfo;
}

export interface CallClusterOptions {
  wrap401Errors?: boolean;
  signal?: AbortSignal;
}

export interface CallClusterWithRequest {
  /* eslint-disable */
  (request: Request, endpoint: 'bulk', params: BulkIndexDocumentsParams, options?: CallClusterOptions): ReturnType<ESClient['bulk']>;
  (request: Request, endpoint: 'clearScroll', params: ClearScrollParams, options?: CallClusterOptions): ReturnType<ESClient['clearScroll']>;
  (request: Request, endpoint: 'count', params: CountParams, options?: CallClusterOptions): ReturnType<ESClient['count']>;
  (request: Request, endpoint: 'create', params: CreateDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['create']>;
  (request: Request, endpoint: 'delete', params: DeleteDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['delete']>;
  (request: Request, endpoint: 'deleteByQuery', params: DeleteDocumentByQueryParams, options?: CallClusterOptions): ReturnType<ESClient['deleteByQuery']>;
  (request: Request, endpoint: 'deleteScript', params: DeleteScriptParams, options?: CallClusterOptions): ReturnType<ESClient['deleteScript']>;
  (request: Request, endpoint: 'deleteTemplate', params: DeleteTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['deleteTemplate']>;
  (request: Request, endpoint: 'exists', params: ExistsParams, options?: CallClusterOptions): ReturnType<ESClient['exists']>;
  (request: Request, endpoint: 'explain', params: ExplainParams, options?: CallClusterOptions): ReturnType<ESClient['explain']>;
  (request: Request, endpoint: 'fieldStats', params: FieldStatsParams, options?: CallClusterOptions): ReturnType<ESClient['fieldStats']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(request: Request, endpoint: 'get', params: GetParams, options?: CallClusterOptions): Promise<GetResponse<T>>;
  (request: Request, endpoint: 'getScript', params: GetScriptParams, options?: CallClusterOptions): ReturnType<ESClient['getScript']>;
  (request: Request, endpoint: 'getSource', params: GetSourceParams, options?: CallClusterOptions): ReturnType<ESClient['getSource']>;
  (request: Request, endpoint: 'getTemplate', params: GetTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['getTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(request: Request, endpoint: 'index', params: IndexDocumentParams<T>, options?: CallClusterOptions): ReturnType<ESClient['index']>;
  (request: Request, endpoint: 'info', params: InfoParams, options?: CallClusterOptions): ReturnType<ESClient['info']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(request: Request, endpoint: 'mget', params: MGetParams, options?: CallClusterOptions): Promise<MGetResponse<T>>;
  <T>(request: Request, endpoint: 'msearch', params: MSearchParams, options?: CallClusterOptions): Promise<MSearchResponse<T>>;
  <T>(request: Request, endpoint: 'msearchTemplate', params: MSearchTemplateParams, options?: CallClusterOptions): Promise<MSearchResponse<T>>;
  (request: Request, endpoint: 'mtermvectors', params: MTermVectorsParams, options?: CallClusterOptions): ReturnType<ESClient['mtermvectors']>;
  (request: Request, endpoint: 'ping', params: PingParams, options?: CallClusterOptions): ReturnType<ESClient['ping']>;
  (request: Request, endpoint: 'putScript', params: PutScriptParams, options?: CallClusterOptions): ReturnType<ESClient['putScript']>;
  (request: Request, endpoint: 'putTemplate', params: PutTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['putTemplate']>;
  (request: Request, endpoint: 'reindex', params: ReindexParams, options?: CallClusterOptions): ReturnType<ESClient['reindex']>;
  (request: Request, endpoint: 'reindexRethrottle', params: ReindexRethrottleParams, options?: CallClusterOptions): ReturnType<ESClient['reindexRethrottle']>;
  (request: Request, endpoint: 'renderSearchTemplate', params: RenderSearchTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['renderSearchTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(request: Request, endpoint: 'scroll', params: ScrollParams, options?: CallClusterOptions): Promise<SearchResponse<T>>;
  <T>(request: Request, endpoint: 'search', params: SearchParams, options?: CallClusterOptions): Promise<SearchResponse<T>>;
  (request: Request, endpoint: 'searchShards', params: SearchShardsParams, options?: CallClusterOptions): ReturnType<ESClient['searchShards']>;
  (request: Request, endpoint: 'searchTemplate', params: SearchTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['searchTemplate']>;
  (request: Request, endpoint: 'suggest', params: SuggestParams, options?: CallClusterOptions): ReturnType<ESClient['suggest']>;
  (request: Request, endpoint: 'termvectors', params: TermvectorsParams, options?: CallClusterOptions): ReturnType<ESClient['termvectors']>;
  (request: Request, endpoint: 'update', params: UpdateDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['update']>;
  (request: Request, endpoint: 'updateByQuery', params: UpdateDocumentByQueryParams, options?: CallClusterOptions): ReturnType<ESClient['updateByQuery']>;

  // cat namespace
  (request: Request, endpoint: 'cat.aliases', params: CatAliasesParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['aliases']>;
  (request: Request, endpoint: 'cat.allocation', params: CatAllocationParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['allocation']>;
  (request: Request, endpoint: 'cat.count', params: CatAllocationParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['count']>;
  (request: Request, endpoint: 'cat.fielddata', params: CatFielddataParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['fielddata']>;
  (request: Request, endpoint: 'cat.health', params: CatHealthParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['health']>;
  (request: Request, endpoint: 'cat.help', params: CatHelpParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['help']>;
  (request: Request, endpoint: 'cat.indices', params: CatIndicesParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['indices']>;
  (request: Request, endpoint: 'cat.master', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['master']>;
  (request: Request, endpoint: 'cat.nodeattrs', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['nodeattrs']>;
  (request: Request, endpoint: 'cat.nodes', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['nodes']>;
  (request: Request, endpoint: 'cat.pendingTasks', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['pendingTasks']>;
  (request: Request, endpoint: 'cat.plugins', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['plugins']>;
  (request: Request, endpoint: 'cat.recovery', params: CatRecoveryParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['recovery']>;
  (request: Request, endpoint: 'cat.repositories', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['repositories']>;
  (request: Request, endpoint: 'cat.segments', params: CatSegmentsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['segments']>;
  (request: Request, endpoint: 'cat.shards', params: CatShardsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['shards']>;
  (request: Request, endpoint: 'cat.snapshots', params: CatSnapshotsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['snapshots']>;
  (request: Request, endpoint: 'cat.tasks', params: CatTasksParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['tasks']>;
  (request: Request, endpoint: 'cat.threadPool', params: CatThreadPoolParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['threadPool']>;

  // cluster namespace
  (request: Request, endpoint: 'cluster.allocationExplain', params: ClusterAllocationExplainParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['allocationExplain']>;
  (request: Request, endpoint: 'cluster.getSettings', params: ClusterGetSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['getSettings']>;
  (request: Request, endpoint: 'cluster.health', params: ClusterHealthParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['health']>;
  (request: Request, endpoint: 'cluster.pendingTasks', params: ClusterPendingTasksParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['pendingTasks']>;
  (request: Request, endpoint: 'cluster.putSettings', params: ClusterPutSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['putSettings']>;
  (request: Request, endpoint: 'cluster.reroute', params: ClusterRerouteParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['reroute']>;
  (request: Request, endpoint: 'cluster.state', params: ClusterStateParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['state']>;
  (request: Request, endpoint: 'cluster.stats', params: ClusterStatsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['stats']>;

  // indices namespace
  (request: Request, endpoint: 'indices.analyze', params: IndicesAnalyzeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['analyze']>;
  (request: Request, endpoint: 'indices.clearCache', params: IndicesClearCacheParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['clearCache']>;
  (request: Request, endpoint: 'indices.close', params: IndicesCloseParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['close']>;
  (request: Request, endpoint: 'indices.create', params: IndicesCreateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['create']>;
  (request: Request, endpoint: 'indices.delete', params: IndicesDeleteParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['delete']>;
  (request: Request, endpoint: 'indices.deleteAlias', params: IndicesDeleteAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['deleteAlias']>;
  (request: Request, endpoint: 'indices.deleteTemplate', params: IndicesDeleteTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['deleteTemplate']>;
  (request: Request, endpoint: 'indices.exists', params: IndicesExistsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['exists']>;
  (request: Request, endpoint: 'indices.existsAlias', params: IndicesExistsAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsAlias']>;
  (request: Request, endpoint: 'indices.existsTemplate', params: IndicesExistsTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsTemplate']>;
  (request: Request, endpoint: 'indices.existsType', params: IndicesExistsTypeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsType']>;
  (request: Request, endpoint: 'indices.flush', params: IndicesFlushParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['flush']>;
  (request: Request, endpoint: 'indices.flushSynced', params: IndicesFlushSyncedParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['flushSynced']>;
  (request: Request, endpoint: 'indices.forcemerge', params: IndicesForcemergeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['forcemerge']>;
  (request: Request, endpoint: 'indices.get', params: IndicesGetParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['get']>;
  (request: Request, endpoint: 'indices.getAlias', params: IndicesGetAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getAlias']>;
  (request: Request, endpoint: 'indices.getFieldMapping', params: IndicesGetFieldMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getFieldMapping']>;
  (request: Request, endpoint: 'indices.getMapping', params: IndicesGetMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getMapping']>;
  (request: Request, endpoint: 'indices.getSettings', params: IndicesGetSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getSettings']>;
  (request: Request, endpoint: 'indices.getTemplate', params: IndicesGetTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getTemplate']>;
  (request: Request, endpoint: 'indices.getUpgrade', params: IndicesGetUpgradeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getUpgrade']>;
  (request: Request, endpoint: 'indices.open', params: IndicesOpenParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['open']>;
  (request: Request, endpoint: 'indices.putAlias', params: IndicesPutAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putAlias']>;
  (request: Request, endpoint: 'indices.putMapping', params: IndicesPutMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putMapping']>;
  (request: Request, endpoint: 'indices.putSettings', params: IndicesPutSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putSettings']>;
  (request: Request, endpoint: 'indices.putTemplate', params: IndicesPutTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putTemplate']>;
  (request: Request, endpoint: 'indices.recovery', params: IndicesRecoveryParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['recovery']>;
  (request: Request, endpoint: 'indices.refresh', params: IndicesRefreshParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['refresh']>;
  (request: Request, endpoint: 'indices.rollover', params: IndicesRolloverParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['rollover']>;
  (request: Request, endpoint: 'indices.segments', params: IndicesSegmentsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['segments']>;
  (request: Request, endpoint: 'indices.shardStores', params: IndicesShardStoresParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['shardStores']>;
  (request: Request, endpoint: 'indices.shrink', params: IndicesShrinkParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['shrink']>;
  (request: Request, endpoint: 'indices.stats', params: IndicesStatsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['stats']>;
  (request: Request, endpoint: 'indices.updateAliases', params: IndicesUpdateAliasesParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['updateAliases']>;
  (request: Request, endpoint: 'indices.upgrade', params: IndicesUpgradeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['upgrade']>;
  (request: Request, endpoint: 'indices.validateQuery', params: IndicesValidateQueryParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['validateQuery']>;

  // ingest namepsace
  (request: Request, endpoint: 'ingest.deletePipeline', params: IngestDeletePipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['deletePipeline']>;
  (request: Request, endpoint: 'ingest.getPipeline', params: IngestGetPipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['getPipeline']>;
  (request: Request, endpoint: 'ingest.putPipeline', params: IngestPutPipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['putPipeline']>;
  (request: Request, endpoint: 'ingest.simulate', params: IngestSimulateParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['simulate']>;

  // nodes namespace
  (request: Request, endpoint: 'nodes.hotThreads', params: NodesHotThreadsParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['hotThreads']>;
  (request: Request, endpoint: 'nodes.info', params: NodesInfoParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['info']>;
  (request: Request, endpoint: 'nodes.stats', params: NodesStatsParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['stats']>;

  // snapshot namespace
  (request: Request, endpoint: 'snapshot.create', params: SnapshotCreateParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['create']>;
  (request: Request, endpoint: 'snapshot.createRepository', params: SnapshotCreateRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['createRepository']>;
  (request: Request, endpoint: 'snapshot.delete', params: SnapshotDeleteParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['delete']>;
  (request: Request, endpoint: 'snapshot.deleteRepository', params: SnapshotDeleteRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['deleteRepository']>;
  (request: Request, endpoint: 'snapshot.get', params: SnapshotGetParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['get']>;
  (request: Request, endpoint: 'snapshot.getRepository', params: SnapshotGetRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['getRepository']>;
  (request: Request, endpoint: 'snapshot.restore', params: SnapshotRestoreParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['restore']>;
  (request: Request, endpoint: 'snapshot.status', params: SnapshotStatusParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['status']>;
  (request: Request, endpoint: 'snapshot.verifyRepository', params: SnapshotVerifyRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['verifyRepository']>;

  // tasks namespace
  (request: Request, endpoint: 'tasks.cancel', params: TasksCancelParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['cancel']>;
  (request: Request, endpoint: 'tasks.get', params: TasksGetParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['get']>;
  (request: Request, endpoint: 'tasks.list', params: TasksListParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['list']>;

  // other APIs accessed via transport.request
  (
    request: Request,
    endpoint: 'transport.request',
    clientParams: AssistantAPIClientParams,
    options?: {}
  ): Promise<AssistanceAPIResponse>;
  (
    request: Request,
    endpoint: 'transport.request',
    clientParams: DeprecationAPIClientParams,
    options?: {}
  ): Promise<DeprecationAPIResponse>;

  // Catch-all definition
  <T = any>(
    request: Request,
    endpoint: string,
    clientParams?: any,
    options?: CallClusterOptions
  ): Promise<T>;
  /* eslint-enable */
}

export interface CallCluster {
  /* eslint-disable */
  (endpoint: 'bulk', params: BulkIndexDocumentsParams, options?: CallClusterOptions): ReturnType<ESClient['bulk']>;
  (endpoint: 'clearScroll', params: ClearScrollParams, options?: CallClusterOptions): ReturnType<ESClient['clearScroll']>;
  (endpoint: 'count', params: CountParams, options?: CallClusterOptions): ReturnType<ESClient['count']>;
  (endpoint: 'create', params: CreateDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['create']>;
  (endpoint: 'delete', params: DeleteDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['delete']>;
  (endpoint: 'deleteByQuery', params: DeleteDocumentByQueryParams, options?: CallClusterOptions): ReturnType<ESClient['deleteByQuery']>;
  (endpoint: 'deleteScript', params: DeleteScriptParams, options?: CallClusterOptions): ReturnType<ESClient['deleteScript']>;
  (endpoint: 'deleteTemplate', params: DeleteTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['deleteTemplate']>;
  (endpoint: 'exists', params: ExistsParams, options?: CallClusterOptions): ReturnType<ESClient['exists']>;
  (endpoint: 'explain', params: ExplainParams, options?: CallClusterOptions): ReturnType<ESClient['explain']>;
  (endpoint: 'fieldStats', params: FieldStatsParams, options?: CallClusterOptions): ReturnType<ESClient['fieldStats']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'get', params: GetParams, options?: CallClusterOptions): Promise<GetResponse<T>>;
  (endpoint: 'getScript', params: GetScriptParams, options?: CallClusterOptions): ReturnType<ESClient['getScript']>;
  (endpoint: 'getSource', params: GetSourceParams, options?: CallClusterOptions): ReturnType<ESClient['getSource']>;
  (endpoint: 'getTemplate', params: GetTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['getTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'index', params: IndexDocumentParams<T>, options?: CallClusterOptions): ReturnType<ESClient['index']>;
  (endpoint: 'info', params: InfoParams, options?: CallClusterOptions): ReturnType<ESClient['info']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'mget', params: MGetParams, options?: CallClusterOptions): Promise<MGetResponse<T>>;
  <T>(endpoint: 'msearch', params: MSearchParams, options?: CallClusterOptions): Promise<MSearchResponse<T>>;
  <T>(endpoint: 'msearchTemplate', params: MSearchTemplateParams, options?: CallClusterOptions): Promise<MSearchResponse<T>>;
  (endpoint: 'mtermvectors', params: MTermVectorsParams, options?: CallClusterOptions): ReturnType<ESClient['mtermvectors']>;
  (endpoint: 'ping', params: PingParams, options?: CallClusterOptions): ReturnType<ESClient['ping']>;
  (endpoint: 'putScript', params: PutScriptParams, options?: CallClusterOptions): ReturnType<ESClient['putScript']>;
  (endpoint: 'putTemplate', params: PutTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['putTemplate']>;
  (endpoint: 'reindex', params: ReindexParams, options?: CallClusterOptions): ReturnType<ESClient['reindex']>;
  (endpoint: 'reindexRethrottle', params: ReindexRethrottleParams, options?: CallClusterOptions): ReturnType<ESClient['reindexRethrottle']>;
  (endpoint: 'renderSearchTemplate', params: RenderSearchTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['renderSearchTemplate']>;
  // Generic types cannot be properly looked up with ReturnType. Hard code these explicitly.
  <T>(endpoint: 'scroll', params: ScrollParams, options?: CallClusterOptions): Promise<SearchResponse<T>>;
  <T>(endpoint: 'search', params: SearchParams, options?: CallClusterOptions): Promise<SearchResponse<T>>;
  (endpoint: 'searchShards', params: SearchShardsParams, options?: CallClusterOptions): ReturnType<ESClient['searchShards']>;
  (endpoint: 'searchTemplate', params: SearchTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['searchTemplate']>;
  (endpoint: 'suggest', params: SuggestParams, options?: CallClusterOptions): ReturnType<ESClient['suggest']>;
  (endpoint: 'termvectors', params: TermvectorsParams, options?: CallClusterOptions): ReturnType<ESClient['termvectors']>;
  (endpoint: 'update', params: UpdateDocumentParams, options?: CallClusterOptions): ReturnType<ESClient['update']>;
  (endpoint: 'updateByQuery', params: UpdateDocumentByQueryParams, options?: CallClusterOptions): ReturnType<ESClient['updateByQuery']>;

  // cat namespace
  (endpoint: 'cat.aliases', params: CatAliasesParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['aliases']>;
  (endpoint: 'cat.allocation', params: CatAllocationParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['allocation']>;
  (endpoint: 'cat.count', params: CatAllocationParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['count']>;
  (endpoint: 'cat.fielddata', params: CatFielddataParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['fielddata']>;
  (endpoint: 'cat.health', params: CatHealthParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['health']>;
  (endpoint: 'cat.help', params: CatHelpParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['help']>;
  (endpoint: 'cat.indices', params: CatIndicesParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['indices']>;
  (endpoint: 'cat.master', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['master']>;
  (endpoint: 'cat.nodeattrs', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['nodeattrs']>;
  (endpoint: 'cat.nodes', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['nodes']>;
  (endpoint: 'cat.pendingTasks', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['pendingTasks']>;
  (endpoint: 'cat.plugins', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['plugins']>;
  (endpoint: 'cat.recovery', params: CatRecoveryParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['recovery']>;
  (endpoint: 'cat.repositories', params: CatCommonParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['repositories']>;
  (endpoint: 'cat.segments', params: CatSegmentsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['segments']>;
  (endpoint: 'cat.shards', params: CatShardsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['shards']>;
  (endpoint: 'cat.snapshots', params: CatSnapshotsParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['snapshots']>;
  (endpoint: 'cat.tasks', params: CatTasksParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['tasks']>;
  (endpoint: 'cat.threadPool', params: CatThreadPoolParams, options?: CallClusterOptions): ReturnType<ESClient['cat']['threadPool']>;

  // cluster namespace
  (endpoint: 'cluster.allocationExplain', params: ClusterAllocationExplainParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['allocationExplain']>;
  (endpoint: 'cluster.getSettings', params: ClusterGetSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['getSettings']>;
  (endpoint: 'cluster.health', params: ClusterHealthParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['health']>;
  (endpoint: 'cluster.pendingTasks', params: ClusterPendingTasksParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['pendingTasks']>;
  (endpoint: 'cluster.putSettings', params: ClusterPutSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['putSettings']>;
  (endpoint: 'cluster.reroute', params: ClusterRerouteParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['reroute']>;
  (endpoint: 'cluster.state', params: ClusterStateParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['state']>;
  (endpoint: 'cluster.stats', params: ClusterStatsParams, options?: CallClusterOptions): ReturnType<ESClient['cluster']['stats']>;

  // indices namespace
  (endpoint: 'indices.analyze', params: IndicesAnalyzeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['analyze']>;
  (endpoint: 'indices.clearCache', params: IndicesClearCacheParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['clearCache']>;
  (endpoint: 'indices.close', params: IndicesCloseParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['close']>;
  (endpoint: 'indices.create', params: IndicesCreateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['create']>;
  (endpoint: 'indices.delete', params: IndicesDeleteParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['delete']>;
  (endpoint: 'indices.deleteAlias', params: IndicesDeleteAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['deleteAlias']>;
  (endpoint: 'indices.deleteTemplate', params: IndicesDeleteTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['deleteTemplate']>;
  (endpoint: 'indices.exists', params: IndicesExistsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['exists']>;
  (endpoint: 'indices.existsAlias', params: IndicesExistsAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsAlias']>;
  (endpoint: 'indices.existsTemplate', params: IndicesExistsTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsTemplate']>;
  (endpoint: 'indices.existsType', params: IndicesExistsTypeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['existsType']>;
  (endpoint: 'indices.flush', params: IndicesFlushParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['flush']>;
  (endpoint: 'indices.flushSynced', params: IndicesFlushSyncedParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['flushSynced']>;
  (endpoint: 'indices.forcemerge', params: IndicesForcemergeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['forcemerge']>;
  (endpoint: 'indices.get', params: IndicesGetParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['get']>;
  (endpoint: 'indices.getAlias', params: IndicesGetAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getAlias']>;
  (endpoint: 'indices.getFieldMapping', params: IndicesGetFieldMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getFieldMapping']>;
  (endpoint: 'indices.getMapping', params: IndicesGetMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getMapping']>;
  (endpoint: 'indices.getSettings', params: IndicesGetSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getSettings']>;
  (endpoint: 'indices.getTemplate', params: IndicesGetTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getTemplate']>;
  (endpoint: 'indices.getUpgrade', params: IndicesGetUpgradeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['getUpgrade']>;
  (endpoint: 'indices.open', params: IndicesOpenParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['open']>;
  (endpoint: 'indices.putAlias', params: IndicesPutAliasParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putAlias']>;
  (endpoint: 'indices.putMapping', params: IndicesPutMappingParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putMapping']>;
  (endpoint: 'indices.putSettings', params: IndicesPutSettingsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putSettings']>;
  (endpoint: 'indices.putTemplate', params: IndicesPutTemplateParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['putTemplate']>;
  (endpoint: 'indices.recovery', params: IndicesRecoveryParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['recovery']>;
  (endpoint: 'indices.refresh', params: IndicesRefreshParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['refresh']>;
  (endpoint: 'indices.rollover', params: IndicesRolloverParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['rollover']>;
  (endpoint: 'indices.segments', params: IndicesSegmentsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['segments']>;
  (endpoint: 'indices.shardStores', params: IndicesShardStoresParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['shardStores']>;
  (endpoint: 'indices.shrink', params: IndicesShrinkParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['shrink']>;
  (endpoint: 'indices.stats', params: IndicesStatsParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['stats']>;
  (endpoint: 'indices.updateAliases', params: IndicesUpdateAliasesParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['updateAliases']>;
  (endpoint: 'indices.upgrade', params: IndicesUpgradeParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['upgrade']>;
  (endpoint: 'indices.validateQuery', params: IndicesValidateQueryParams, options?: CallClusterOptions): ReturnType<ESClient['indices']['validateQuery']>;

  // ingest namespace
  (endpoint: 'ingest.deletePipeline', params: IngestDeletePipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['deletePipeline']>;
  (endpoint: 'ingest.getPipeline', params: IngestGetPipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['getPipeline']>;
  (endpoint: 'ingest.putPipeline', params: IngestPutPipelineParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['putPipeline']>;
  (endpoint: 'ingest.simulate', params: IngestSimulateParams, options?: CallClusterOptions): ReturnType<ESClient['ingest']['simulate']>;

  // nodes namespace
  (endpoint: 'nodes.hotThreads', params: NodesHotThreadsParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['hotThreads']>;
  (endpoint: 'nodes.info', params: NodesInfoParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['info']>;
  (endpoint: 'nodes.stats', params: NodesStatsParams, options?: CallClusterOptions): ReturnType<ESClient['nodes']['stats']>;

  // snapshot namespace
  (endpoint: 'snapshot.create', params: SnapshotCreateParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['create']>;
  (endpoint: 'snapshot.createRepository', params: SnapshotCreateRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['createRepository']>;
  (endpoint: 'snapshot.delete', params: SnapshotDeleteParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['delete']>;
  (endpoint: 'snapshot.deleteRepository', params: SnapshotDeleteRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['deleteRepository']>;
  (endpoint: 'snapshot.get', params: SnapshotGetParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['get']>;
  (endpoint: 'snapshot.getRepository', params: SnapshotGetRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['getRepository']>;
  (endpoint: 'snapshot.restore', params: SnapshotRestoreParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['restore']>;
  (endpoint: 'snapshot.status', params: SnapshotStatusParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['status']>;
  (endpoint: 'snapshot.verifyRepository', params: SnapshotVerifyRepositoryParams, options?: CallClusterOptions): ReturnType<ESClient['snapshot']['verifyRepository']>;

  // tasks namespace
  (endpoint: 'tasks.cancel', params: TasksCancelParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['cancel']>;
  (endpoint: 'tasks.get', params: TasksGetParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['get']>;
  (endpoint: 'tasks.list', params: TasksListParams, options?: CallClusterOptions): ReturnType<ESClient['tasks']['list']>;

  // other APIs accessed via transport.request
  (endpoint: 'transport.request', clientParams: AssistantAPIClientParams, options?: {}): Promise<
    AssistanceAPIResponse
  >;
  (endpoint: 'transport.request', clientParams: DeprecationAPIClientParams, options?: {}): Promise<
    DeprecationAPIResponse
  >;

  // Catch-all definition
  <T = any>(endpoint: string, clientParams?: any, options?: CallClusterOptions): Promise<T>;
  /* eslint-enable */
}

export interface ElasticsearchPlugin {
  status: { on: (status: string, cb: () => void) => void };
  getCluster(name: string): Cluster;
}
