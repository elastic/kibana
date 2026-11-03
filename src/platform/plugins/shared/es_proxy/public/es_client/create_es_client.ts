/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mirrors `@elastic/elasticsearch/lib/api/index.js` without `bulk`, whose module loads the Node-only
// transport. Imported per module so the browser bundle never loads the elasticsearch-js `Client`.
import type { Transport } from '@elastic/elasticsearch';
import AsyncSearchApi from '@elastic/elasticsearch/lib/api/api/async_search';
import AutoscalingApi from '@elastic/elasticsearch/lib/api/api/autoscaling';
import CatApi from '@elastic/elasticsearch/lib/api/api/cat';
import CcrApi from '@elastic/elasticsearch/lib/api/api/ccr';
import ClusterApi from '@elastic/elasticsearch/lib/api/api/cluster';
import ConnectorApi from '@elastic/elasticsearch/lib/api/api/connector';
import DanglingIndicesApi from '@elastic/elasticsearch/lib/api/api/dangling_indices';
import EncryptionApi from '@elastic/elasticsearch/lib/api/api/encryption';
import EnrichApi from '@elastic/elasticsearch/lib/api/api/enrich';
import EqlApi from '@elastic/elasticsearch/lib/api/api/eql';
import EsqlApi from '@elastic/elasticsearch/lib/api/api/esql';
import FeaturesApi from '@elastic/elasticsearch/lib/api/api/features';
import FleetApi from '@elastic/elasticsearch/lib/api/api/fleet';
import GraphApi from '@elastic/elasticsearch/lib/api/api/graph';
import IlmApi from '@elastic/elasticsearch/lib/api/api/ilm';
import IndicesApi from '@elastic/elasticsearch/lib/api/api/indices';
import InferenceApi from '@elastic/elasticsearch/lib/api/api/inference';
import IngestApi from '@elastic/elasticsearch/lib/api/api/ingest';
import LicenseApi from '@elastic/elasticsearch/lib/api/api/license';
import LogstashApi from '@elastic/elasticsearch/lib/api/api/logstash';
import MigrationApi from '@elastic/elasticsearch/lib/api/api/migration';
import MlApi from '@elastic/elasticsearch/lib/api/api/ml';
import MonitoringApi from '@elastic/elasticsearch/lib/api/api/monitoring';
import NodesApi from '@elastic/elasticsearch/lib/api/api/nodes';
import ProfilingApi from '@elastic/elasticsearch/lib/api/api/profiling';
import ProjectApi from '@elastic/elasticsearch/lib/api/api/project';
import QueryRulesApi from '@elastic/elasticsearch/lib/api/api/query_rules';
import RollupApi from '@elastic/elasticsearch/lib/api/api/rollup';
import SearchApplicationApi from '@elastic/elasticsearch/lib/api/api/search_application';
import SearchableSnapshotsApi from '@elastic/elasticsearch/lib/api/api/searchable_snapshots';
import SecurityApi from '@elastic/elasticsearch/lib/api/api/security';
import ShutdownApi from '@elastic/elasticsearch/lib/api/api/shutdown';
import SimulateApi from '@elastic/elasticsearch/lib/api/api/simulate';
import SlmApi from '@elastic/elasticsearch/lib/api/api/slm';
import SnapshotApi from '@elastic/elasticsearch/lib/api/api/snapshot';
import SqlApi from '@elastic/elasticsearch/lib/api/api/sql';
import SslApi from '@elastic/elasticsearch/lib/api/api/ssl';
import StreamsApi from '@elastic/elasticsearch/lib/api/api/streams';
import SynonymsApi from '@elastic/elasticsearch/lib/api/api/synonyms';
import TasksApi from '@elastic/elasticsearch/lib/api/api/tasks';
import TextStructureApi from '@elastic/elasticsearch/lib/api/api/text_structure';
import TransformApi from '@elastic/elasticsearch/lib/api/api/transform';
import WatcherApi from '@elastic/elasticsearch/lib/api/api/watcher';
import XpackApi from '@elastic/elasticsearch/lib/api/api/xpack';
import cancelReindexApi from '@elastic/elasticsearch/lib/api/api/cancel_reindex';
import capabilitiesApi from '@elastic/elasticsearch/lib/api/api/capabilities';
import clearScrollApi from '@elastic/elasticsearch/lib/api/api/clear_scroll';
import closePointInTimeApi from '@elastic/elasticsearch/lib/api/api/close_point_in_time';
import countApi from '@elastic/elasticsearch/lib/api/api/count';
import createApi from '@elastic/elasticsearch/lib/api/api/create';
import deleteApi from '@elastic/elasticsearch/lib/api/api/delete';
import deleteByQueryApi from '@elastic/elasticsearch/lib/api/api/delete_by_query';
import deleteByQueryRethrottleApi from '@elastic/elasticsearch/lib/api/api/delete_by_query_rethrottle';
import deleteScriptApi from '@elastic/elasticsearch/lib/api/api/delete_script';
import existsApi from '@elastic/elasticsearch/lib/api/api/exists';
import existsSourceApi from '@elastic/elasticsearch/lib/api/api/exists_source';
import explainApi from '@elastic/elasticsearch/lib/api/api/explain';
import fieldCapsApi from '@elastic/elasticsearch/lib/api/api/field_caps';
import getApi from '@elastic/elasticsearch/lib/api/api/get';
import getReindexApi from '@elastic/elasticsearch/lib/api/api/get_reindex';
import getScriptApi from '@elastic/elasticsearch/lib/api/api/get_script';
import getScriptContextApi from '@elastic/elasticsearch/lib/api/api/get_script_context';
import getScriptLanguagesApi from '@elastic/elasticsearch/lib/api/api/get_script_languages';
import getSourceApi from '@elastic/elasticsearch/lib/api/api/get_source';
import healthReportApi from '@elastic/elasticsearch/lib/api/api/health_report';
import indexApi from '@elastic/elasticsearch/lib/api/api/index';
import infoApi from '@elastic/elasticsearch/lib/api/api/info';
import knnSearchApi from '@elastic/elasticsearch/lib/api/api/knn_search';
import listReindexApi from '@elastic/elasticsearch/lib/api/api/list_reindex';
import mgetApi from '@elastic/elasticsearch/lib/api/api/mget';
import msearchApi from '@elastic/elasticsearch/lib/api/api/msearch';
import msearchTemplateApi from '@elastic/elasticsearch/lib/api/api/msearch_template';
import mtermvectorsApi from '@elastic/elasticsearch/lib/api/api/mtermvectors';
import openPointInTimeApi from '@elastic/elasticsearch/lib/api/api/open_point_in_time';
import pingApi from '@elastic/elasticsearch/lib/api/api/ping';
import putScriptApi from '@elastic/elasticsearch/lib/api/api/put_script';
import rankEvalApi from '@elastic/elasticsearch/lib/api/api/rank_eval';
import reindexApi from '@elastic/elasticsearch/lib/api/api/reindex';
import reindexRethrottleApi from '@elastic/elasticsearch/lib/api/api/reindex_rethrottle';
import renderSearchTemplateApi from '@elastic/elasticsearch/lib/api/api/render_search_template';
import scriptsPainlessExecuteApi from '@elastic/elasticsearch/lib/api/api/scripts_painless_execute';
import scrollApi from '@elastic/elasticsearch/lib/api/api/scroll';
import searchApi from '@elastic/elasticsearch/lib/api/api/search';
import searchMvtApi from '@elastic/elasticsearch/lib/api/api/search_mvt';
import searchShardsApi from '@elastic/elasticsearch/lib/api/api/search_shards';
import searchTemplateApi from '@elastic/elasticsearch/lib/api/api/search_template';
import termsEnumApi from '@elastic/elasticsearch/lib/api/api/terms_enum';
import termvectorsApi from '@elastic/elasticsearch/lib/api/api/termvectors';
import updateApi from '@elastic/elasticsearch/lib/api/api/update';
import updateByQueryApi from '@elastic/elasticsearch/lib/api/api/update_by_query';
import updateByQueryRethrottleApi from '@elastic/elasticsearch/lib/api/api/update_by_query_rethrottle';
import { createBulk } from './bulk';
import type { ProxyRequest, ProxyTransport } from './proxy_transport';
import { createProxyTransport } from './proxy_transport';
import type { EsProxyClient } from './types';

/**
 * Creates an elasticsearch-js API client whose requests go through the Elasticsearch proxy.
 */
export const createEsClient = (proxyRequest: ProxyRequest): EsProxyClient => {
  const proxyTransport: ProxyTransport = createProxyTransport(proxyRequest);
  // The generated API modules only call `transport.request`, which the proxy transport implements.
  const transport = proxyTransport as unknown as Transport;

  return {
    transport,
    bulk: createBulk(proxyTransport),
    asyncSearch: new AsyncSearchApi(transport),
    autoscaling: new AutoscalingApi(transport),
    cat: new CatApi(transport),
    ccr: new CcrApi(transport),
    cluster: new ClusterApi(transport),
    connector: new ConnectorApi(transport),
    danglingIndices: new DanglingIndicesApi(transport),
    encryption: new EncryptionApi(transport),
    enrich: new EnrichApi(transport),
    eql: new EqlApi(transport),
    esql: new EsqlApi(transport),
    features: new FeaturesApi(transport),
    fleet: new FleetApi(transport),
    graph: new GraphApi(transport),
    ilm: new IlmApi(transport),
    indices: new IndicesApi(transport),
    inference: new InferenceApi(transport),
    ingest: new IngestApi(transport),
    license: new LicenseApi(transport),
    logstash: new LogstashApi(transport),
    migration: new MigrationApi(transport),
    ml: new MlApi(transport),
    monitoring: new MonitoringApi(transport),
    nodes: new NodesApi(transport),
    profiling: new ProfilingApi(transport),
    project: new ProjectApi(transport),
    queryRules: new QueryRulesApi(transport),
    rollup: new RollupApi(transport),
    searchApplication: new SearchApplicationApi(transport),
    searchableSnapshots: new SearchableSnapshotsApi(transport),
    security: new SecurityApi(transport),
    shutdown: new ShutdownApi(transport),
    simulate: new SimulateApi(transport),
    slm: new SlmApi(transport),
    snapshot: new SnapshotApi(transport),
    sql: new SqlApi(transport),
    ssl: new SslApi(transport),
    streams: new StreamsApi(transport),
    synonyms: new SynonymsApi(transport),
    tasks: new TasksApi(transport),
    textStructure: new TextStructureApi(transport),
    transform: new TransformApi(transport),
    watcher: new WatcherApi(transport),
    xpack: new XpackApi(transport),
    cancelReindex: cancelReindexApi,
    capabilities: capabilitiesApi,
    clearScroll: clearScrollApi,
    closePointInTime: closePointInTimeApi,
    count: countApi,
    create: createApi,
    delete: deleteApi,
    deleteByQuery: deleteByQueryApi,
    deleteByQueryRethrottle: deleteByQueryRethrottleApi,
    deleteScript: deleteScriptApi,
    exists: existsApi,
    existsSource: existsSourceApi,
    explain: explainApi,
    fieldCaps: fieldCapsApi,
    get: getApi,
    getReindex: getReindexApi,
    getScript: getScriptApi,
    getScriptContext: getScriptContextApi,
    getScriptLanguages: getScriptLanguagesApi,
    getSource: getSourceApi,
    healthReport: healthReportApi,
    index: indexApi,
    info: infoApi,
    knnSearch: knnSearchApi,
    listReindex: listReindexApi,
    mget: mgetApi,
    msearch: msearchApi,
    msearchTemplate: msearchTemplateApi,
    mtermvectors: mtermvectorsApi,
    openPointInTime: openPointInTimeApi,
    ping: pingApi,
    putScript: putScriptApi,
    rankEval: rankEvalApi,
    reindex: reindexApi,
    reindexRethrottle: reindexRethrottleApi,
    renderSearchTemplate: renderSearchTemplateApi,
    scriptsPainlessExecute: scriptsPainlessExecuteApi,
    scroll: scrollApi,
    search: searchApi,
    searchMvt: searchMvtApi,
    searchShards: searchShardsApi,
    searchTemplate: searchTemplateApi,
    termsEnum: termsEnumApi,
    termvectors: termvectorsApi,
    update: updateApi,
    updateByQuery: updateByQueryApi,
    updateByQueryRethrottle: updateByQueryRethrottleApi,
  };
};
