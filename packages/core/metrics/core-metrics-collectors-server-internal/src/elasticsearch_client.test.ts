/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { AgentManager } from '@kbn/core-elasticsearch-client-server-internal';
import { ElasticsearchClientsMetricsCollector } from './elasticsearch_client';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';

jest.mock('@kbn/core-elasticsearch-client-server-internal');
jest.mock('./get_agents_sockets_stats');

const AgentManagerMock = AgentManager as jest.MockedClass<typeof AgentManager>;
const getAgentsSocketsStatsMock = getAgentsSocketsStats as jest.MockedFunction<
  typeof getAgentsSocketsStats
>;

describe('ElasticsearchClientsMetricsCollector', () => {
  test('#collect calls getAgentsSocketsStats for each of the two sets (Http, Https) of Agents managed by the provided AgentManager', async () => {
    const httpAgents = new Set<HttpAgent>([new HttpAgent(), new HttpAgent()]);
    const httpsAgents = new Set<HttpsAgent>([new HttpsAgent(), new HttpsAgent()]);

    AgentManagerMock.mockImplementationOnce(() => ({
      getHttpAgents: jest.fn(() => httpAgents),
      getHttpsAgents: jest.fn(() => httpsAgents),
    }));
    getAgentsSocketsStatsMock.mockImplementationOnce(() => 'http stats');
    getAgentsSocketsStatsMock.mockImplementationOnce(() => 'https stats');

    const agentManager = new AgentManager();
    const esClientsMetricsCollector = new ElasticsearchClientsMetricsCollector(agentManager);
    const metrics = await esClientsMetricsCollector.collect();

    expect(agentManager.getHttpAgents).toHaveBeenCalledTimes(1);
    expect(getAgentsSocketsStats).toHaveBeenCalledTimes(2);
    expect(getAgentsSocketsStats).toHaveBeenNthCalledWith(1, httpAgents);
    expect(getAgentsSocketsStats).toHaveBeenNthCalledWith(2, httpsAgents);
    expect(metrics).toMatchInlineSnapshot(`
      Object {
        "http": "http stats",
        "https": "https stats",
      }
    `);
  });
});
