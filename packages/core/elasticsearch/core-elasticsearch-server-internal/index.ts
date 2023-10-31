/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ElasticsearchService } from './src/elasticsearch_service';
export { config, configSchema, ElasticsearchConfig } from './src/elasticsearch_config';
export type { ElasticsearchConfigType } from './src/elasticsearch_config';
export type {
  NodesVersionCompatibility,
  PollEsNodesVersionOptions,
  NodesInfo,
  NodeInfo,
} from './src/version_check/ensure_es_version';
export type {
  ElasticsearchStatusMeta,
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './src/types';
export { pollEsNodesVersion } from './src/version_check/ensure_es_version';
export {
  isSupportedEsServer,
  isNotFoundFromUnsupportedServer,
} from './src/supported_server_response_check';
export { CoreElasticsearchRouteHandlerContext } from './src/elasticsearch_route_handler_context';
export { retryCallCluster, migrationRetryCallCluster } from './src/retry_call_cluster';
export { isInlineScriptingEnabled } from './src/is_scripting_enabled';
export { getCapabilitiesFromClient } from './src/get_capabilities';
export { isRetryableEsClientError } from './src/retryable_es_client_errors';
export type { ClusterInfo } from './src/get_cluster_info';
