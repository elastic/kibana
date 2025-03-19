/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
import { createAgentStatsProviderMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { ElasticsearchClientsMetricsCollector } from './elasticsearch_client';

jest.mock('@kbn/core-elasticsearch-client-server-internal');

export const sampleEsClientMetrics: ElasticsearchClientsMetrics = {
  totalActiveSockets: 25,
  totalIdleSockets: 2,
  totalQueuedRequests: 0,
};

describe('ElasticsearchClientsMetricsCollector', () => {
  test('#collect calls getAgentsSocketsStats with the Agents managed by the provided AgentManager', async () => {
    const agentStatsProvider = createAgentStatsProviderMock();
    agentStatsProvider.getAgentsStats.mockReturnValue(sampleEsClientMetrics);

    const esClientsMetricsCollector = new ElasticsearchClientsMetricsCollector(agentStatsProvider);
    const metrics = await esClientsMetricsCollector.collect();

    expect(metrics).toEqual(sampleEsClientMetrics);
  });
});
