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

import { Client } from '@elastic/elasticsearch';
import { TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';
import { Headers } from '../../http/router';
import { ClientFacade } from './client_facade';

/**
 * Returns a {@link ClientFacade | facade} to be used to query given es client.
 *
 * This is used both for the internal client and the scoped ones. authorization header
 * must be passed when creating a scoped facade.
 *
 * @internal
 */
export const getClientFacade = (client: Client, headers: Headers = {}): ClientFacade => {
  // do not rename or change this method signature without adapting the API generation script
  // at `src/dev/generate_es_client.ts`
  const addHeaders = (options?: TransportRequestOptions): TransportRequestOptions => {
    if (!options) {
      return {
        headers,
      };
    }
    return {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };
  };

  return {
    transport: {
      request: (params, options) => client.transport.request(params, addHeaders(options)),
    },
    /* GENERATED */
    asyncSearch: {
      delete: (params, options) => client.asyncSearch.delete(params, addHeaders(options)),
      get: (params, options) => client.asyncSearch.get(params, addHeaders(options)),
      submit: (params, options) => client.asyncSearch.submit(params, addHeaders(options)),
    },
    autoscaling: {
      deleteAutoscalingPolicy: (params, options) =>
        client.autoscaling.deleteAutoscalingPolicy(params, addHeaders(options)),
      getAutoscalingDecision: (params, options) =>
        client.autoscaling.getAutoscalingDecision(params, addHeaders(options)),
      getAutoscalingPolicy: (params, options) =>
        client.autoscaling.getAutoscalingPolicy(params, addHeaders(options)),
      putAutoscalingPolicy: (params, options) =>
        client.autoscaling.putAutoscalingPolicy(params, addHeaders(options)),
    },
    bulk: (params, options) => client.bulk(params, addHeaders(options)),
    cat: {
      aliases: (params, options) => client.cat.aliases(params, addHeaders(options)),
      allocation: (params, options) => client.cat.allocation(params, addHeaders(options)),
      count: (params, options) => client.cat.count(params, addHeaders(options)),
      fielddata: (params, options) => client.cat.fielddata(params, addHeaders(options)),
      health: (params, options) => client.cat.health(params, addHeaders(options)),
      help: (params, options) => client.cat.help(params, addHeaders(options)),
      indices: (params, options) => client.cat.indices(params, addHeaders(options)),
      master: (params, options) => client.cat.master(params, addHeaders(options)),
      mlDataFrameAnalytics: (params, options) =>
        client.cat.mlDataFrameAnalytics(params, addHeaders(options)),
      mlDatafeeds: (params, options) => client.cat.mlDatafeeds(params, addHeaders(options)),
      mlJobs: (params, options) => client.cat.mlJobs(params, addHeaders(options)),
      mlTrainedModels: (params, options) => client.cat.mlTrainedModels(params, addHeaders(options)),
      nodeattrs: (params, options) => client.cat.nodeattrs(params, addHeaders(options)),
      nodes: (params, options) => client.cat.nodes(params, addHeaders(options)),
      pendingTasks: (params, options) => client.cat.pendingTasks(params, addHeaders(options)),
      plugins: (params, options) => client.cat.plugins(params, addHeaders(options)),
      recovery: (params, options) => client.cat.recovery(params, addHeaders(options)),
      repositories: (params, options) => client.cat.repositories(params, addHeaders(options)),
      segments: (params, options) => client.cat.segments(params, addHeaders(options)),
      shards: (params, options) => client.cat.shards(params, addHeaders(options)),
      snapshots: (params, options) => client.cat.snapshots(params, addHeaders(options)),
      tasks: (params, options) => client.cat.tasks(params, addHeaders(options)),
      templates: (params, options) => client.cat.templates(params, addHeaders(options)),
      threadPool: (params, options) => client.cat.threadPool(params, addHeaders(options)),
      transforms: (params, options) => client.cat.transforms(params, addHeaders(options)),
    },
    ccr: {
      deleteAutoFollowPattern: (params, options) =>
        client.ccr.deleteAutoFollowPattern(params, addHeaders(options)),
      follow: (params, options) => client.ccr.follow(params, addHeaders(options)),
      followInfo: (params, options) => client.ccr.followInfo(params, addHeaders(options)),
      followStats: (params, options) => client.ccr.followStats(params, addHeaders(options)),
      forgetFollower: (params, options) => client.ccr.forgetFollower(params, addHeaders(options)),
      getAutoFollowPattern: (params, options) =>
        client.ccr.getAutoFollowPattern(params, addHeaders(options)),
      pauseAutoFollowPattern: (params, options) =>
        client.ccr.pauseAutoFollowPattern(params, addHeaders(options)),
      pauseFollow: (params, options) => client.ccr.pauseFollow(params, addHeaders(options)),
      putAutoFollowPattern: (params, options) =>
        client.ccr.putAutoFollowPattern(params, addHeaders(options)),
      resumeAutoFollowPattern: (params, options) =>
        client.ccr.resumeAutoFollowPattern(params, addHeaders(options)),
      resumeFollow: (params, options) => client.ccr.resumeFollow(params, addHeaders(options)),
      stats: (params, options) => client.ccr.stats(params, addHeaders(options)),
      unfollow: (params, options) => client.ccr.unfollow(params, addHeaders(options)),
    },
    clearScroll: (params, options) => client.clearScroll(params, addHeaders(options)),
    cluster: {
      allocationExplain: (params, options) =>
        client.cluster.allocationExplain(params, addHeaders(options)),
      deleteComponentTemplate: (params, options) =>
        client.cluster.deleteComponentTemplate(params, addHeaders(options)),
      deleteVotingConfigExclusions: (params, options) =>
        client.cluster.deleteVotingConfigExclusions(params, addHeaders(options)),
      existsComponentTemplate: (params, options) =>
        client.cluster.existsComponentTemplate(params, addHeaders(options)),
      getComponentTemplate: (params, options) =>
        client.cluster.getComponentTemplate(params, addHeaders(options)),
      getSettings: (params, options) => client.cluster.getSettings(params, addHeaders(options)),
      health: (params, options) => client.cluster.health(params, addHeaders(options)),
      pendingTasks: (params, options) => client.cluster.pendingTasks(params, addHeaders(options)),
      postVotingConfigExclusions: (params, options) =>
        client.cluster.postVotingConfigExclusions(params, addHeaders(options)),
      putComponentTemplate: (params, options) =>
        client.cluster.putComponentTemplate(params, addHeaders(options)),
      putSettings: (params, options) => client.cluster.putSettings(params, addHeaders(options)),
      remoteInfo: (params, options) => client.cluster.remoteInfo(params, addHeaders(options)),
      reroute: (params, options) => client.cluster.reroute(params, addHeaders(options)),
      state: (params, options) => client.cluster.state(params, addHeaders(options)),
      stats: (params, options) => client.cluster.stats(params, addHeaders(options)),
    },
    count: (params, options) => client.count(params, addHeaders(options)),
    create: (params, options) => client.create(params, addHeaders(options)),
    delete: (params, options) => client.delete(params, addHeaders(options)),
    deleteByQuery: (params, options) => client.deleteByQuery(params, addHeaders(options)),
    deleteByQueryRethrottle: (params, options) =>
      client.deleteByQueryRethrottle(params, addHeaders(options)),
    deleteScript: (params, options) => client.deleteScript(params, addHeaders(options)),
    enrich: {
      deletePolicy: (params, options) => client.enrich.deletePolicy(params, addHeaders(options)),
      executePolicy: (params, options) => client.enrich.executePolicy(params, addHeaders(options)),
      getPolicy: (params, options) => client.enrich.getPolicy(params, addHeaders(options)),
      putPolicy: (params, options) => client.enrich.putPolicy(params, addHeaders(options)),
      stats: (params, options) => client.enrich.stats(params, addHeaders(options)),
    },
    eql: {
      search: (params, options) => client.eql.search(params, addHeaders(options)),
    },
    exists: (params, options) => client.exists(params, addHeaders(options)),
    existsSource: (params, options) => client.existsSource(params, addHeaders(options)),
    explain: (params, options) => client.explain(params, addHeaders(options)),
    fieldCaps: (params, options) => client.fieldCaps(params, addHeaders(options)),
    get: (params, options) => client.get(params, addHeaders(options)),
    getScript: (params, options) => client.getScript(params, addHeaders(options)),
    getScriptContext: (params, options) => client.getScriptContext(params, addHeaders(options)),
    getScriptLanguages: (params, options) => client.getScriptLanguages(params, addHeaders(options)),
    getSource: (params, options) => client.getSource(params, addHeaders(options)),
    graph: {
      explore: (params, options) => client.graph.explore(params, addHeaders(options)),
    },
    ilm: {
      deleteLifecycle: (params, options) => client.ilm.deleteLifecycle(params, addHeaders(options)),
      explainLifecycle: (params, options) =>
        client.ilm.explainLifecycle(params, addHeaders(options)),
      getLifecycle: (params, options) => client.ilm.getLifecycle(params, addHeaders(options)),
      getStatus: (params, options) => client.ilm.getStatus(params, addHeaders(options)),
      moveToStep: (params, options) => client.ilm.moveToStep(params, addHeaders(options)),
      putLifecycle: (params, options) => client.ilm.putLifecycle(params, addHeaders(options)),
      removePolicy: (params, options) => client.ilm.removePolicy(params, addHeaders(options)),
      retry: (params, options) => client.ilm.retry(params, addHeaders(options)),
      start: (params, options) => client.ilm.start(params, addHeaders(options)),
      stop: (params, options) => client.ilm.stop(params, addHeaders(options)),
    },
    index: (params, options) => client.index(params, addHeaders(options)),
    indices: {
      analyze: (params, options) => client.indices.analyze(params, addHeaders(options)),
      clearCache: (params, options) => client.indices.clearCache(params, addHeaders(options)),
      clone: (params, options) => client.indices.clone(params, addHeaders(options)),
      close: (params, options) => client.indices.close(params, addHeaders(options)),
      create: (params, options) => client.indices.create(params, addHeaders(options)),
      createDataStream: (params, options) =>
        client.indices.createDataStream(params, addHeaders(options)),
      delete: (params, options) => client.indices.delete(params, addHeaders(options)),
      deleteAlias: (params, options) => client.indices.deleteAlias(params, addHeaders(options)),
      deleteDataStream: (params, options) =>
        client.indices.deleteDataStream(params, addHeaders(options)),
      deleteIndexTemplate: (params, options) =>
        client.indices.deleteIndexTemplate(params, addHeaders(options)),
      deleteTemplate: (params, options) =>
        client.indices.deleteTemplate(params, addHeaders(options)),
      exists: (params, options) => client.indices.exists(params, addHeaders(options)),
      existsAlias: (params, options) => client.indices.existsAlias(params, addHeaders(options)),
      existsIndexTemplate: (params, options) =>
        client.indices.existsIndexTemplate(params, addHeaders(options)),
      existsTemplate: (params, options) =>
        client.indices.existsTemplate(params, addHeaders(options)),
      existsType: (params, options) => client.indices.existsType(params, addHeaders(options)),
      flush: (params, options) => client.indices.flush(params, addHeaders(options)),
      flushSynced: (params, options) => client.indices.flushSynced(params, addHeaders(options)),
      forcemerge: (params, options) => client.indices.forcemerge(params, addHeaders(options)),
      freeze: (params, options) => client.indices.freeze(params, addHeaders(options)),
      get: (params, options) => client.indices.get(params, addHeaders(options)),
      getAlias: (params, options) => client.indices.getAlias(params, addHeaders(options)),
      getDataStreams: (params, options) =>
        client.indices.getDataStreams(params, addHeaders(options)),
      getFieldMapping: (params, options) =>
        client.indices.getFieldMapping(params, addHeaders(options)),
      getIndexTemplate: (params, options) =>
        client.indices.getIndexTemplate(params, addHeaders(options)),
      getMapping: (params, options) => client.indices.getMapping(params, addHeaders(options)),
      getSettings: (params, options) => client.indices.getSettings(params, addHeaders(options)),
      getTemplate: (params, options) => client.indices.getTemplate(params, addHeaders(options)),
      getUpgrade: (params, options) => client.indices.getUpgrade(params, addHeaders(options)),
      open: (params, options) => client.indices.open(params, addHeaders(options)),
      putAlias: (params, options) => client.indices.putAlias(params, addHeaders(options)),
      putIndexTemplate: (params, options) =>
        client.indices.putIndexTemplate(params, addHeaders(options)),
      putMapping: (params, options) => client.indices.putMapping(params, addHeaders(options)),
      putSettings: (params, options) => client.indices.putSettings(params, addHeaders(options)),
      putTemplate: (params, options) => client.indices.putTemplate(params, addHeaders(options)),
      recovery: (params, options) => client.indices.recovery(params, addHeaders(options)),
      refresh: (params, options) => client.indices.refresh(params, addHeaders(options)),
      reloadSearchAnalyzers: (params, options) =>
        client.indices.reloadSearchAnalyzers(params, addHeaders(options)),
      rollover: (params, options) => client.indices.rollover(params, addHeaders(options)),
      segments: (params, options) => client.indices.segments(params, addHeaders(options)),
      shardStores: (params, options) => client.indices.shardStores(params, addHeaders(options)),
      shrink: (params, options) => client.indices.shrink(params, addHeaders(options)),
      simulateIndexTemplate: (params, options) =>
        client.indices.simulateIndexTemplate(params, addHeaders(options)),
      split: (params, options) => client.indices.split(params, addHeaders(options)),
      stats: (params, options) => client.indices.stats(params, addHeaders(options)),
      unfreeze: (params, options) => client.indices.unfreeze(params, addHeaders(options)),
      updateAliases: (params, options) => client.indices.updateAliases(params, addHeaders(options)),
      upgrade: (params, options) => client.indices.upgrade(params, addHeaders(options)),
      validateQuery: (params, options) => client.indices.validateQuery(params, addHeaders(options)),
    },
    info: (params, options) => client.info(params, addHeaders(options)),
    ingest: {
      deletePipeline: (params, options) =>
        client.ingest.deletePipeline(params, addHeaders(options)),
      getPipeline: (params, options) => client.ingest.getPipeline(params, addHeaders(options)),
      processorGrok: (params, options) => client.ingest.processorGrok(params, addHeaders(options)),
      putPipeline: (params, options) => client.ingest.putPipeline(params, addHeaders(options)),
      simulate: (params, options) => client.ingest.simulate(params, addHeaders(options)),
    },
    license: {
      delete: (params, options) => client.license.delete(params, addHeaders(options)),
      get: (params, options) => client.license.get(params, addHeaders(options)),
      getBasicStatus: (params, options) =>
        client.license.getBasicStatus(params, addHeaders(options)),
      getTrialStatus: (params, options) =>
        client.license.getTrialStatus(params, addHeaders(options)),
      post: (params, options) => client.license.post(params, addHeaders(options)),
      postStartBasic: (params, options) =>
        client.license.postStartBasic(params, addHeaders(options)),
      postStartTrial: (params, options) =>
        client.license.postStartTrial(params, addHeaders(options)),
    },
    mget: (params, options) => client.mget(params, addHeaders(options)),
    migration: {
      deprecations: (params, options) => client.migration.deprecations(params, addHeaders(options)),
    },
    ml: {
      closeJob: (params, options) => client.ml.closeJob(params, addHeaders(options)),
      deleteCalendar: (params, options) => client.ml.deleteCalendar(params, addHeaders(options)),
      deleteCalendarEvent: (params, options) =>
        client.ml.deleteCalendarEvent(params, addHeaders(options)),
      deleteCalendarJob: (params, options) =>
        client.ml.deleteCalendarJob(params, addHeaders(options)),
      deleteDataFrameAnalytics: (params, options) =>
        client.ml.deleteDataFrameAnalytics(params, addHeaders(options)),
      deleteDatafeed: (params, options) => client.ml.deleteDatafeed(params, addHeaders(options)),
      deleteExpiredData: (params, options) =>
        client.ml.deleteExpiredData(params, addHeaders(options)),
      deleteFilter: (params, options) => client.ml.deleteFilter(params, addHeaders(options)),
      deleteForecast: (params, options) => client.ml.deleteForecast(params, addHeaders(options)),
      deleteJob: (params, options) => client.ml.deleteJob(params, addHeaders(options)),
      deleteModelSnapshot: (params, options) =>
        client.ml.deleteModelSnapshot(params, addHeaders(options)),
      deleteTrainedModel: (params, options) =>
        client.ml.deleteTrainedModel(params, addHeaders(options)),
      estimateModelMemory: (params, options) =>
        client.ml.estimateModelMemory(params, addHeaders(options)),
      evaluateDataFrame: (params, options) =>
        client.ml.evaluateDataFrame(params, addHeaders(options)),
      explainDataFrameAnalytics: (params, options) =>
        client.ml.explainDataFrameAnalytics(params, addHeaders(options)),
      findFileStructure: (params, options) =>
        client.ml.findFileStructure(params, addHeaders(options)),
      flushJob: (params, options) => client.ml.flushJob(params, addHeaders(options)),
      forecast: (params, options) => client.ml.forecast(params, addHeaders(options)),
      getBuckets: (params, options) => client.ml.getBuckets(params, addHeaders(options)),
      getCalendarEvents: (params, options) =>
        client.ml.getCalendarEvents(params, addHeaders(options)),
      getCalendars: (params, options) => client.ml.getCalendars(params, addHeaders(options)),
      getCategories: (params, options) => client.ml.getCategories(params, addHeaders(options)),
      getDataFrameAnalytics: (params, options) =>
        client.ml.getDataFrameAnalytics(params, addHeaders(options)),
      getDataFrameAnalyticsStats: (params, options) =>
        client.ml.getDataFrameAnalyticsStats(params, addHeaders(options)),
      getDatafeedStats: (params, options) =>
        client.ml.getDatafeedStats(params, addHeaders(options)),
      getDatafeeds: (params, options) => client.ml.getDatafeeds(params, addHeaders(options)),
      getFilters: (params, options) => client.ml.getFilters(params, addHeaders(options)),
      getInfluencers: (params, options) => client.ml.getInfluencers(params, addHeaders(options)),
      getJobStats: (params, options) => client.ml.getJobStats(params, addHeaders(options)),
      getJobs: (params, options) => client.ml.getJobs(params, addHeaders(options)),
      getModelSnapshots: (params, options) =>
        client.ml.getModelSnapshots(params, addHeaders(options)),
      getOverallBuckets: (params, options) =>
        client.ml.getOverallBuckets(params, addHeaders(options)),
      getRecords: (params, options) => client.ml.getRecords(params, addHeaders(options)),
      getTrainedModels: (params, options) =>
        client.ml.getTrainedModels(params, addHeaders(options)),
      getTrainedModelsStats: (params, options) =>
        client.ml.getTrainedModelsStats(params, addHeaders(options)),
      info: (params, options) => client.ml.info(params, addHeaders(options)),
      openJob: (params, options) => client.ml.openJob(params, addHeaders(options)),
      postCalendarEvents: (params, options) =>
        client.ml.postCalendarEvents(params, addHeaders(options)),
      postData: (params, options) => client.ml.postData(params, addHeaders(options)),
      previewDatafeed: (params, options) => client.ml.previewDatafeed(params, addHeaders(options)),
      putCalendar: (params, options) => client.ml.putCalendar(params, addHeaders(options)),
      putCalendarJob: (params, options) => client.ml.putCalendarJob(params, addHeaders(options)),
      putDataFrameAnalytics: (params, options) =>
        client.ml.putDataFrameAnalytics(params, addHeaders(options)),
      putDatafeed: (params, options) => client.ml.putDatafeed(params, addHeaders(options)),
      putFilter: (params, options) => client.ml.putFilter(params, addHeaders(options)),
      putJob: (params, options) => client.ml.putJob(params, addHeaders(options)),
      putTrainedModel: (params, options) => client.ml.putTrainedModel(params, addHeaders(options)),
      revertModelSnapshot: (params, options) =>
        client.ml.revertModelSnapshot(params, addHeaders(options)),
      setUpgradeMode: (params, options) => client.ml.setUpgradeMode(params, addHeaders(options)),
      startDataFrameAnalytics: (params, options) =>
        client.ml.startDataFrameAnalytics(params, addHeaders(options)),
      startDatafeed: (params, options) => client.ml.startDatafeed(params, addHeaders(options)),
      stopDataFrameAnalytics: (params, options) =>
        client.ml.stopDataFrameAnalytics(params, addHeaders(options)),
      stopDatafeed: (params, options) => client.ml.stopDatafeed(params, addHeaders(options)),
      updateDatafeed: (params, options) => client.ml.updateDatafeed(params, addHeaders(options)),
      updateFilter: (params, options) => client.ml.updateFilter(params, addHeaders(options)),
      updateJob: (params, options) => client.ml.updateJob(params, addHeaders(options)),
      updateModelSnapshot: (params, options) =>
        client.ml.updateModelSnapshot(params, addHeaders(options)),
      validate: (params, options) => client.ml.validate(params, addHeaders(options)),
      validateDetector: (params, options) =>
        client.ml.validateDetector(params, addHeaders(options)),
    },
    monitoring: {
      bulk: (params, options) => client.monitoring.bulk(params, addHeaders(options)),
    },
    msearch: (params, options) => client.msearch(params, addHeaders(options)),
    msearchTemplate: (params, options) => client.msearchTemplate(params, addHeaders(options)),
    mtermvectors: (params, options) => client.mtermvectors(params, addHeaders(options)),
    nodes: {
      hotThreads: (params, options) => client.nodes.hotThreads(params, addHeaders(options)),
      info: (params, options) => client.nodes.info(params, addHeaders(options)),
      reloadSecureSettings: (params, options) =>
        client.nodes.reloadSecureSettings(params, addHeaders(options)),
      stats: (params, options) => client.nodes.stats(params, addHeaders(options)),
      usage: (params, options) => client.nodes.usage(params, addHeaders(options)),
    },
    ping: (params, options) => client.ping(params, addHeaders(options)),
    putScript: (params, options) => client.putScript(params, addHeaders(options)),
    rankEval: (params, options) => client.rankEval(params, addHeaders(options)),
    reindex: (params, options) => client.reindex(params, addHeaders(options)),
    reindexRethrottle: (params, options) => client.reindexRethrottle(params, addHeaders(options)),
    renderSearchTemplate: (params, options) =>
      client.renderSearchTemplate(params, addHeaders(options)),
    rollup: {
      deleteJob: (params, options) => client.rollup.deleteJob(params, addHeaders(options)),
      getJobs: (params, options) => client.rollup.getJobs(params, addHeaders(options)),
      getRollupCaps: (params, options) => client.rollup.getRollupCaps(params, addHeaders(options)),
      getRollupIndexCaps: (params, options) =>
        client.rollup.getRollupIndexCaps(params, addHeaders(options)),
      putJob: (params, options) => client.rollup.putJob(params, addHeaders(options)),
      rollupSearch: (params, options) => client.rollup.rollupSearch(params, addHeaders(options)),
      startJob: (params, options) => client.rollup.startJob(params, addHeaders(options)),
      stopJob: (params, options) => client.rollup.stopJob(params, addHeaders(options)),
    },
    scriptsPainlessExecute: (params, options) =>
      client.scriptsPainlessExecute(params, addHeaders(options)),
    scroll: (params, options) => client.scroll(params, addHeaders(options)),
    search: (params, options) => client.search(params, addHeaders(options)),
    searchShards: (params, options) => client.searchShards(params, addHeaders(options)),
    searchTemplate: (params, options) => client.searchTemplate(params, addHeaders(options)),
    searchableSnapshots: {
      clearCache: (params, options) =>
        client.searchableSnapshots.clearCache(params, addHeaders(options)),
      mount: (params, options) => client.searchableSnapshots.mount(params, addHeaders(options)),
      repositoryStats: (params, options) =>
        client.searchableSnapshots.repositoryStats(params, addHeaders(options)),
      stats: (params, options) => client.searchableSnapshots.stats(params, addHeaders(options)),
    },
    security: {
      authenticate: (params, options) => client.security.authenticate(params, addHeaders(options)),
      changePassword: (params, options) =>
        client.security.changePassword(params, addHeaders(options)),
      clearCachedRealms: (params, options) =>
        client.security.clearCachedRealms(params, addHeaders(options)),
      clearCachedRoles: (params, options) =>
        client.security.clearCachedRoles(params, addHeaders(options)),
      createApiKey: (params, options) => client.security.createApiKey(params, addHeaders(options)),
      deletePrivileges: (params, options) =>
        client.security.deletePrivileges(params, addHeaders(options)),
      deleteRole: (params, options) => client.security.deleteRole(params, addHeaders(options)),
      deleteRoleMapping: (params, options) =>
        client.security.deleteRoleMapping(params, addHeaders(options)),
      deleteUser: (params, options) => client.security.deleteUser(params, addHeaders(options)),
      disableUser: (params, options) => client.security.disableUser(params, addHeaders(options)),
      enableUser: (params, options) => client.security.enableUser(params, addHeaders(options)),
      getApiKey: (params, options) => client.security.getApiKey(params, addHeaders(options)),
      getBuiltinPrivileges: (params, options) =>
        client.security.getBuiltinPrivileges(params, addHeaders(options)),
      getPrivileges: (params, options) =>
        client.security.getPrivileges(params, addHeaders(options)),
      getRole: (params, options) => client.security.getRole(params, addHeaders(options)),
      getRoleMapping: (params, options) =>
        client.security.getRoleMapping(params, addHeaders(options)),
      getToken: (params, options) => client.security.getToken(params, addHeaders(options)),
      getUser: (params, options) => client.security.getUser(params, addHeaders(options)),
      getUserPrivileges: (params, options) =>
        client.security.getUserPrivileges(params, addHeaders(options)),
      hasPrivileges: (params, options) =>
        client.security.hasPrivileges(params, addHeaders(options)),
      invalidateApiKey: (params, options) =>
        client.security.invalidateApiKey(params, addHeaders(options)),
      invalidateToken: (params, options) =>
        client.security.invalidateToken(params, addHeaders(options)),
      putPrivileges: (params, options) =>
        client.security.putPrivileges(params, addHeaders(options)),
      putRole: (params, options) => client.security.putRole(params, addHeaders(options)),
      putRoleMapping: (params, options) =>
        client.security.putRoleMapping(params, addHeaders(options)),
      putUser: (params, options) => client.security.putUser(params, addHeaders(options)),
    },
    slm: {
      deleteLifecycle: (params, options) => client.slm.deleteLifecycle(params, addHeaders(options)),
      executeLifecycle: (params, options) =>
        client.slm.executeLifecycle(params, addHeaders(options)),
      executeRetention: (params, options) =>
        client.slm.executeRetention(params, addHeaders(options)),
      getLifecycle: (params, options) => client.slm.getLifecycle(params, addHeaders(options)),
      getStats: (params, options) => client.slm.getStats(params, addHeaders(options)),
      getStatus: (params, options) => client.slm.getStatus(params, addHeaders(options)),
      putLifecycle: (params, options) => client.slm.putLifecycle(params, addHeaders(options)),
      start: (params, options) => client.slm.start(params, addHeaders(options)),
      stop: (params, options) => client.slm.stop(params, addHeaders(options)),
    },
    snapshot: {
      cleanupRepository: (params, options) =>
        client.snapshot.cleanupRepository(params, addHeaders(options)),
      create: (params, options) => client.snapshot.create(params, addHeaders(options)),
      createRepository: (params, options) =>
        client.snapshot.createRepository(params, addHeaders(options)),
      delete: (params, options) => client.snapshot.delete(params, addHeaders(options)),
      deleteRepository: (params, options) =>
        client.snapshot.deleteRepository(params, addHeaders(options)),
      get: (params, options) => client.snapshot.get(params, addHeaders(options)),
      getRepository: (params, options) =>
        client.snapshot.getRepository(params, addHeaders(options)),
      restore: (params, options) => client.snapshot.restore(params, addHeaders(options)),
      status: (params, options) => client.snapshot.status(params, addHeaders(options)),
      verifyRepository: (params, options) =>
        client.snapshot.verifyRepository(params, addHeaders(options)),
    },
    sql: {
      clearCursor: (params, options) => client.sql.clearCursor(params, addHeaders(options)),
      query: (params, options) => client.sql.query(params, addHeaders(options)),
      translate: (params, options) => client.sql.translate(params, addHeaders(options)),
    },
    ssl: {
      certificates: (params, options) => client.ssl.certificates(params, addHeaders(options)),
    },
    tasks: {
      cancel: (params, options) => client.tasks.cancel(params, addHeaders(options)),
      get: (params, options) => client.tasks.get(params, addHeaders(options)),
      list: (params, options) => client.tasks.list(params, addHeaders(options)),
    },
    termvectors: (params, options) => client.termvectors(params, addHeaders(options)),
    transform: {
      deleteTransform: (params, options) =>
        client.transform.deleteTransform(params, addHeaders(options)),
      getTransform: (params, options) => client.transform.getTransform(params, addHeaders(options)),
      getTransformStats: (params, options) =>
        client.transform.getTransformStats(params, addHeaders(options)),
      previewTransform: (params, options) =>
        client.transform.previewTransform(params, addHeaders(options)),
      putTransform: (params, options) => client.transform.putTransform(params, addHeaders(options)),
      startTransform: (params, options) =>
        client.transform.startTransform(params, addHeaders(options)),
      stopTransform: (params, options) =>
        client.transform.stopTransform(params, addHeaders(options)),
      updateTransform: (params, options) =>
        client.transform.updateTransform(params, addHeaders(options)),
    },
    update: (params, options) => client.update(params, addHeaders(options)),
    updateByQuery: (params, options) => client.updateByQuery(params, addHeaders(options)),
    updateByQueryRethrottle: (params, options) =>
      client.updateByQueryRethrottle(params, addHeaders(options)),
    watcher: {
      ackWatch: (params, options) => client.watcher.ackWatch(params, addHeaders(options)),
      activateWatch: (params, options) => client.watcher.activateWatch(params, addHeaders(options)),
      deactivateWatch: (params, options) =>
        client.watcher.deactivateWatch(params, addHeaders(options)),
      deleteWatch: (params, options) => client.watcher.deleteWatch(params, addHeaders(options)),
      executeWatch: (params, options) => client.watcher.executeWatch(params, addHeaders(options)),
      getWatch: (params, options) => client.watcher.getWatch(params, addHeaders(options)),
      putWatch: (params, options) => client.watcher.putWatch(params, addHeaders(options)),
      start: (params, options) => client.watcher.start(params, addHeaders(options)),
      stats: (params, options) => client.watcher.stats(params, addHeaders(options)),
      stop: (params, options) => client.watcher.stop(params, addHeaders(options)),
    },
    xpack: {
      info: (params, options) => client.xpack.info(params, addHeaders(options)),
      usage: (params, options) => client.xpack.usage(params, addHeaders(options)),
    },
    /* /GENERATED */
  };
};
