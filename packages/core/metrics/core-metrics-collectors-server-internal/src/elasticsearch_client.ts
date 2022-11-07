/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClientsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import type { AgentStore } from '@kbn/core-elasticsearch-client-server-internal';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';

export class ElasticsearchClientsMetricsCollector
  implements MetricsCollector<ElasticsearchClientsMetrics>
{
  constructor(private readonly agentStore: AgentStore) {}

  public async collect(): Promise<ElasticsearchClientsMetrics> {
    return await getAgentsSocketsStats(this.agentStore.getAgents());
  }

  public reset() {
    // we do not have a state in this Collector, aka metrics are not accumulated over time.
    // Thus, we don't need to perform any cleanup to reset the collected metrics
  }
}
