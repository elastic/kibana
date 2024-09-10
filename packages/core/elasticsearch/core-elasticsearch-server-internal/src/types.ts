/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceStart,
  ElasticsearchServiceSetup,
} from '@kbn/core-elasticsearch-server';
import type { AgentStatsProvider } from '@kbn/core-elasticsearch-client-server-internal';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { NodesVersionCompatibility, NodeInfo } from './version_check/ensure_es_version';
import type { ClusterInfo } from './get_cluster_info';

/** @internal */
export type InternalElasticsearchServicePreboot = ElasticsearchServicePreboot;

/** @internal */
export interface InternalElasticsearchServiceSetup extends ElasticsearchServiceSetup {
  agentStatsProvider: AgentStatsProvider;
  clusterInfo$: Observable<ClusterInfo>;
  esNodesCompatibility$: Observable<NodesVersionCompatibility>;
  status$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
}

/**
 * @internal
 */
export interface InternalElasticsearchServiceStart extends ElasticsearchServiceStart {
  metrics: {
    /**
     * The number of milliseconds we had to wait until ES was ready.
     *
     * Technically, this is the amount of time spent within the `isValidConnection` check of
     * the ES service's start method.
     */
    elasticsearchWaitTime: number;
  };
}

/** @internal */
export interface ElasticsearchStatusMeta {
  warningNodes: NodeInfo[];
  incompatibleNodes: NodeInfo[];
  nodesInfoRequestError?: Error;
}
