/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
import { createAgentStoreMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getAgentsSocketsStatsMock } from './get_agents_sockets_stats.test.mocks';
import { ElasticsearchClientsMetricsCollector } from './elasticsearch_client';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';

jest.mock('@kbn/core-elasticsearch-client-server-internal');

export const sampleEsClientMetrics: ElasticsearchClientsMetrics = {
  totalActiveSockets: 25,
  totalIdleSockets: 2,
  totalQueuedRequests: 0,
};

describe('ElasticsearchClientsMetricsCollector', () => {
  test('#collect calls getAgentsSocketsStats with the Agents managed by the provided AgentManager', async () => {
    const agents = new Set<HttpAgent>([new HttpAgent(), new HttpsAgent()]);
    const agentStore = createAgentStoreMock(agents);
    getAgentsSocketsStatsMock.mockReturnValueOnce(sampleEsClientMetrics);

    const esClientsMetricsCollector = new ElasticsearchClientsMetricsCollector(agentStore);
    const metrics = await esClientsMetricsCollector.collect();

    expect(agentStore.getAgents).toHaveBeenCalledTimes(1);
    expect(getAgentsSocketsStats).toHaveBeenCalledTimes(1);
    expect(getAgentsSocketsStats).toHaveBeenNthCalledWith(1, agents);
    expect(metrics).toEqual(sampleEsClientMetrics);
  });
});
