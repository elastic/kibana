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

import { ApiResponse } from '@elastic/elasticsearch';
import {
  RequestBody,
  RequestNDBody,
  TransportRequestOptions,
  TransportRequestParams,
  TransportRequestPromise,
} from '@elastic/elasticsearch/lib/Transport';
import * as RequestParams from '@elastic/elasticsearch/api/requestParams';

/**
 * Facade used to query the elasticsearch cluster.
 *
 * @public
 */
export interface ClientFacade {
  transport: {
    request(
      params: TransportRequestParams,
      options?: TransportRequestOptions
    ): Promise<ApiResponse>;
  };
  /* GENERATED */
  asyncSearch: {
    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AsyncSearchDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AsyncSearchGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    submit<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.AsyncSearchSubmit<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  autoscaling: {
    deleteAutoscalingPolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AutoscalingDeleteAutoscalingPolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getAutoscalingDecision<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AutoscalingGetAutoscalingDecision,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getAutoscalingPolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.AutoscalingGetAutoscalingPolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putAutoscalingPolicy<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.AutoscalingPutAutoscalingPolicy<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  bulk<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.Bulk<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  cat: {
    aliases<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatAliases,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    allocation<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatAllocation,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    count<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatCount,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    fielddata<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatFielddata,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    health<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatHealth,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    help<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatHelp,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    indices<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatIndices,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    master<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatMaster,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    mlDataFrameAnalytics<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatMlDataFrameAnalytics,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    mlDatafeeds<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatMlDatafeeds,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    mlJobs<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatMlJobs,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    mlTrainedModels<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatMlTrainedModels,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    nodeattrs<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatNodeattrs,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    nodes<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatNodes,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    pendingTasks<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatPendingTasks,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    plugins<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatPlugins,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    recovery<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatRecovery,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    repositories<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatRepositories,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    segments<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatSegments,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    shards<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatShards,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    snapshots<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatSnapshots,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    tasks<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatTasks,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    templates<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatTemplates,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    threadPool<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatThreadPool,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    transforms<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CatTransforms,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  ccr: {
    deleteAutoFollowPattern<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrDeleteAutoFollowPattern,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    follow<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.CcrFollow<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    followInfo<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrFollowInfo,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    followStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrFollowStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    forgetFollower<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.CcrForgetFollower<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getAutoFollowPattern<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrGetAutoFollowPattern,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    pauseAutoFollowPattern<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrPauseAutoFollowPattern,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    pauseFollow<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrPauseFollow,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putAutoFollowPattern<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.CcrPutAutoFollowPattern<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    resumeAutoFollowPattern<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrResumeAutoFollowPattern,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    resumeFollow<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.CcrResumeFollow<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    unfollow<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.CcrUnfollow,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  clearScroll<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.ClearScroll<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  cluster: {
    allocationExplain<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.ClusterAllocationExplain<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteComponentTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterDeleteComponentTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteVotingConfigExclusions<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterDeleteVotingConfigExclusions,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    existsComponentTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterExistsComponentTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getComponentTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterGetComponentTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getSettings<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterGetSettings,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    health<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterHealth,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    pendingTasks<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterPendingTasks,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    postVotingConfigExclusions<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterPostVotingConfigExclusions,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putComponentTemplate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.ClusterPutComponentTemplate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putSettings<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.ClusterPutSettings<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    remoteInfo<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterRemoteInfo,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    reroute<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.ClusterReroute<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    state<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterState,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.ClusterStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  count<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Count<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  create<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Create<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  delete<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Delete,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  deleteByQuery<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.DeleteByQuery<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  deleteByQueryRethrottle<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.DeleteByQueryRethrottle,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  deleteScript<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.DeleteScript,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  enrich: {
    deletePolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.EnrichDeletePolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    executePolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.EnrichExecutePolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getPolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.EnrichGetPolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putPolicy<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.EnrichPutPolicy<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.EnrichStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  eql: {
    search<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.EqlSearch<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  exists<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Exists,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  existsSource<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.ExistsSource,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  explain<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Explain<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  fieldCaps<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.FieldCaps,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  get<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Get,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  getScript<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.GetScript,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  getScriptContext<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.GetScriptContext,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  getScriptLanguages<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.GetScriptLanguages,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  getSource<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.GetSource,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  graph: {
    explore<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.GraphExplore<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  ilm: {
    deleteLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmDeleteLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    explainLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmExplainLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmGetLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getStatus<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmGetStatus,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    moveToStep<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IlmMoveToStep<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putLifecycle<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IlmPutLifecycle<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    removePolicy<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmRemovePolicy,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    retry<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmRetry,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    start<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmStart,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stop<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IlmStop,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  index<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Index<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  indices: {
    analyze<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesAnalyze<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    clearCache<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesClearCache,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    clone<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesClone<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    close<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesClose,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    create<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesCreate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    createDataStream<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesCreateDataStream<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteAlias<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDeleteAlias,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteDataStream<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDeleteDataStream,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteIndexTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDeleteIndexTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesDeleteTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    exists<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesExists,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    existsAlias<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesExistsAlias,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    existsIndexTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesExistsIndexTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    existsTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesExistsTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    existsType<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesExistsType,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    flush<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesFlush,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    flushSynced<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesFlushSynced,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    forcemerge<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesForcemerge,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    freeze<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesFreeze,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getAlias<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetAlias,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getDataStreams<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetDataStreams,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getFieldMapping<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetFieldMapping,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getIndexTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetIndexTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getMapping<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetMapping,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getSettings<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetSettings,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTemplate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetTemplate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getUpgrade<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesGetUpgrade,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    open<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesOpen,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putAlias<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesPutAlias<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putIndexTemplate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesPutIndexTemplate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putMapping<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesPutMapping<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putSettings<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesPutSettings<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putTemplate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesPutTemplate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    recovery<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesRecovery,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    refresh<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesRefresh,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    reloadSearchAnalyzers<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesReloadSearchAnalyzers,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    rollover<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesRollover<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    segments<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesSegments,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    shardStores<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesShardStores,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    shrink<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesShrink<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    simulateIndexTemplate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesSimulateIndexTemplate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    split<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesSplit<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    unfreeze<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesUnfreeze,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateAliases<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesUpdateAliases<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    upgrade<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IndicesUpgrade,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    validateQuery<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IndicesValidateQuery<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  info<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Info,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  ingest: {
    deletePipeline<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IngestDeletePipeline,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getPipeline<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IngestGetPipeline,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    processorGrok<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.IngestProcessorGrok,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putPipeline<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IngestPutPipeline<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    simulate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.IngestSimulate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  license: {
    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicenseDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicenseGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getBasicStatus<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicenseGetBasicStatus,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTrialStatus<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicenseGetTrialStatus,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    post<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.LicensePost<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    postStartBasic<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicensePostStartBasic,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    postStartTrial<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.LicensePostStartTrial,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  mget<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Mget<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  migration: {
    deprecations<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MigrationDeprecations,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  ml: {
    closeJob<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlCloseJob<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteCalendar<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteCalendar,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteCalendarEvent<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteCalendarEvent,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteCalendarJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteCalendarJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteDataFrameAnalytics<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteDataFrameAnalytics,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteDatafeed<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteDatafeed,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteExpiredData<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlDeleteExpiredData<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteFilter<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteFilter,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteForecast<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteForecast,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteModelSnapshot<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteModelSnapshot,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteTrainedModel<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlDeleteTrainedModel,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    estimateModelMemory<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlEstimateModelMemory<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    evaluateDataFrame<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlEvaluateDataFrame<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    explainDataFrameAnalytics<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlExplainDataFrameAnalytics<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    findFileStructure<
      TResponse = Record<string, any>,
      TRequestBody extends RequestNDBody = Array<Record<string, any>>,
      TContext = unknown
    >(
      params?: RequestParams.MlFindFileStructure<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    flushJob<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlFlushJob<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    forecast<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlForecast,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getBuckets<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetBuckets<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getCalendarEvents<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetCalendarEvents,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getCalendars<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetCalendars<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getCategories<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetCategories<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getDataFrameAnalytics<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetDataFrameAnalytics,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getDataFrameAnalyticsStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetDataFrameAnalyticsStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getDatafeedStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetDatafeedStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getDatafeeds<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetDatafeeds,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getFilters<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetFilters,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getInfluencers<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetInfluencers<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getJobStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetJobStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getJobs<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetJobs,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getModelSnapshots<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetModelSnapshots<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getOverallBuckets<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetOverallBuckets<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRecords<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlGetRecords<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTrainedModels<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetTrainedModels,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTrainedModelsStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlGetTrainedModelsStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    info<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlInfo,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    openJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlOpenJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    postCalendarEvents<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPostCalendarEvents<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    postData<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPostData<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    previewDatafeed<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlPreviewDatafeed,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putCalendar<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutCalendar<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putCalendarJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlPutCalendarJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putDataFrameAnalytics<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutDataFrameAnalytics<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putDatafeed<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutDatafeed<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putFilter<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutFilter<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putJob<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutJob<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putTrainedModel<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlPutTrainedModel<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    revertModelSnapshot<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlRevertModelSnapshot<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    setUpgradeMode<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlSetUpgradeMode,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    startDataFrameAnalytics<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlStartDataFrameAnalytics<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    startDatafeed<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlStartDatafeed<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stopDataFrameAnalytics<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlStopDataFrameAnalytics<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stopDatafeed<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.MlStopDatafeed,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateDatafeed<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlUpdateDatafeed<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateFilter<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlUpdateFilter<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateJob<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlUpdateJob<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateModelSnapshot<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlUpdateModelSnapshot<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    validate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlValidate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    validateDetector<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.MlValidateDetector<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  monitoring: {
    bulk<
      TResponse = Record<string, any>,
      TRequestBody extends RequestNDBody = Array<Record<string, any>>,
      TContext = unknown
    >(
      params?: RequestParams.MonitoringBulk<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  msearch<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.Msearch<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  msearchTemplate<
    TResponse = Record<string, any>,
    TRequestBody extends RequestNDBody = Array<Record<string, any>>,
    TContext = unknown
  >(
    params?: RequestParams.MsearchTemplate<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  mtermvectors<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Mtermvectors<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  nodes: {
    hotThreads<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.NodesHotThreads,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    info<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.NodesInfo,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    reloadSecureSettings<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.NodesReloadSecureSettings<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.NodesStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    usage<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.NodesUsage,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  ping<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.Ping,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  putScript<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.PutScript<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  rankEval<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.RankEval<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  reindex<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Reindex<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  reindexRethrottle<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.ReindexRethrottle,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  renderSearchTemplate<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.RenderSearchTemplate<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  rollup: {
    deleteJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupDeleteJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getJobs<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupGetJobs,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRollupCaps<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupGetRollupCaps,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRollupIndexCaps<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupGetRollupIndexCaps,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putJob<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.RollupPutJob<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    rollupSearch<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.RollupRollupSearch<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    startJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupStartJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stopJob<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.RollupStopJob,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  scriptsPainlessExecute<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.ScriptsPainlessExecute<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  scroll<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Scroll<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  search<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Search<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  searchShards<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.SearchShards,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  searchTemplate<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.SearchTemplate<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  searchableSnapshots: {
    clearCache<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SearchableSnapshotsClearCache,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    mount<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SearchableSnapshotsMount<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    repositoryStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SearchableSnapshotsRepositoryStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SearchableSnapshotsStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  security: {
    authenticate<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityAuthenticate,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    changePassword<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityChangePassword<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    clearCachedRealms<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityClearCachedRealms,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    clearCachedRoles<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityClearCachedRoles,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    createApiKey<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityCreateApiKey<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deletePrivileges<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityDeletePrivileges,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteRole<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityDeleteRole,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteRoleMapping<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityDeleteRoleMapping,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteUser<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityDeleteUser,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    disableUser<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityDisableUser,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    enableUser<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityEnableUser,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getApiKey<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetApiKey,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getBuiltinPrivileges<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetBuiltinPrivileges,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getPrivileges<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetPrivileges,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRole<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetRole,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRoleMapping<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetRoleMapping,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getToken<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityGetToken<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getUser<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetUser,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getUserPrivileges<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SecurityGetUserPrivileges,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    hasPrivileges<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityHasPrivileges<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    invalidateApiKey<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityInvalidateApiKey<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    invalidateToken<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityInvalidateToken<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putPrivileges<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityPutPrivileges<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putRole<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityPutRole<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putRoleMapping<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityPutRoleMapping<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putUser<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SecurityPutUser<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  slm: {
    deleteLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmDeleteLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    executeLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmExecuteLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    executeRetention<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmExecuteRetention,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getLifecycle<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmGetLifecycle,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmGetStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getStatus<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmGetStatus,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putLifecycle<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SlmPutLifecycle<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    start<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmStart,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stop<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SlmStop,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  snapshot: {
    cleanupRepository<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotCleanupRepository,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    create<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SnapshotCreate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    createRepository<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SnapshotCreateRepository<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    delete<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotDelete,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteRepository<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotDeleteRepository,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getRepository<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotGetRepository,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    restore<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SnapshotRestore<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    status<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotStatus,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    verifyRepository<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SnapshotVerifyRepository,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  sql: {
    clearCursor<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SqlClearCursor<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    query<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SqlQuery<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    translate<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.SqlTranslate<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  ssl: {
    certificates<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.SslCertificates,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  tasks: {
    cancel<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TasksCancel,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    get<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TasksGet,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    list<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TasksList,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  termvectors<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Termvectors<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  transform: {
    deleteTransform<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TransformDeleteTransform,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTransform<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TransformGetTransform,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getTransformStats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TransformGetTransformStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    previewTransform<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.TransformPreviewTransform<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putTransform<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.TransformPutTransform<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    startTransform<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TransformStartTransform,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stopTransform<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.TransformStopTransform,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    updateTransform<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.TransformUpdateTransform<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  update<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.Update<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  updateByQuery<
    TResponse = Record<string, any>,
    TRequestBody extends RequestBody = Record<string, any>,
    TContext = unknown
  >(
    params?: RequestParams.UpdateByQuery<TRequestBody>,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  updateByQueryRethrottle<TResponse = Record<string, any>, TContext = unknown>(
    params?: RequestParams.UpdateByQueryRethrottle,
    options?: TransportRequestOptions
  ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  watcher: {
    ackWatch<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherAckWatch,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    activateWatch<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherActivateWatch,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deactivateWatch<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherDeactivateWatch,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    deleteWatch<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherDeleteWatch,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    executeWatch<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.WatcherExecuteWatch<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    getWatch<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherGetWatch,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    putWatch<
      TResponse = Record<string, any>,
      TRequestBody extends RequestBody = Record<string, any>,
      TContext = unknown
    >(
      params?: RequestParams.WatcherPutWatch<TRequestBody>,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    start<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherStart,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stats<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherStats,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    stop<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.WatcherStop,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  xpack: {
    info<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.XpackInfo,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
    usage<TResponse = Record<string, any>, TContext = unknown>(
      params?: RequestParams.XpackUsage,
      options?: TransportRequestOptions
    ): TransportRequestPromise<ApiResponse<TResponse, TContext>>;
  };
  /* /GENERATED */
}
