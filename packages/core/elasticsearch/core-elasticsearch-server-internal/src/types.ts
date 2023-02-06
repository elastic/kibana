/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceStart,
  ElasticsearchServiceSetup,
} from '@kbn/core-elasticsearch-server';
import type { AgentStore } from '@kbn/core-elasticsearch-client-server-internal';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { NodesVersionCompatibility, NodeInfo } from './version_check/ensure_es_version';
import type { ClusterInfo } from './get_cluster_info';

/** @internal */
export type InternalElasticsearchServicePreboot = ElasticsearchServicePreboot;

/** @internal */
export interface InternalElasticsearchServiceSetup extends ElasticsearchServiceSetup {
  agentStore: AgentStore;
  clusterInfo$: Observable<ClusterInfo>;
  esNodesCompatibility$: Observable<NodesVersionCompatibility>;
  status$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
}

/**
 * @internal
 */
export type InternalElasticsearchServiceStart = ElasticsearchServiceStart;

/** @internal */
export interface ElasticsearchStatusMeta {
  warningNodes: NodeInfo[];
  incompatibleNodes: NodeInfo[];
  nodesInfoRequestError?: Error;
}
