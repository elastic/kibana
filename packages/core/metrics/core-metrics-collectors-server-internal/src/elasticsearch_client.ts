/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ElasticsearchClientsMetricsByProtocol,
  MetricsCollector,
} from '@kbn/core-metrics-server';
import type { AgentManager } from '@kbn/core-elasticsearch-client-server-internal';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';

export class ElasticsearchClientsMetricsCollector
  implements MetricsCollector<ElasticsearchClientsMetricsByProtocol>
{
  constructor(private readonly agentManager: AgentManager) {}

  public async collect(): Promise<ElasticsearchClientsMetricsByProtocol> {
    const http = this.agentManager.getHttpAgents();
    const https = this.agentManager.getHttpsAgents();

    return {
      http: getAgentsSocketsStats(http),
      https: getAgentsSocketsStats(https),
    };
  }

  public reset() {
    // TODO check if we have to implement
  }
}
