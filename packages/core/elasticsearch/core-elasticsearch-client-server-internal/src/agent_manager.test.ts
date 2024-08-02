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
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { getAgentsSocketsStatsMock } from './get_agents_sockets_stats.test.mocks';
import { AgentManager } from './agent_manager';

jest.mock('http');
jest.mock('https');

const HttpAgentMock = HttpAgent as unknown as jest.Mock<HttpAgent>;
const HttpsAgentMock = HttpsAgent as unknown as jest.Mock<HttpsAgent>;

describe('AgentManager', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(() => {
    HttpAgentMock.mockClear();
    HttpsAgentMock.mockClear();
  });

  describe('#getAgentFactory()', () => {
    it('provides factories which are different at each call', () => {
      const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
      const agentFactory1 = agentManager.getAgentFactory();
      const agentFactory2 = agentManager.getAgentFactory();
      expect(agentFactory1).not.toEqual(agentFactory2);
    });

    describe('one agent factory', () => {
      it('provides instances of the http and https Agent classes', () => {
        const mockedHttpAgent = new HttpAgent();
        HttpAgentMock.mockImplementationOnce(() => mockedHttpAgent);
        const mockedHttpsAgent = new HttpsAgent();
        HttpsAgentMock.mockImplementationOnce(() => mockedHttpsAgent);
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory = agentManager.getAgentFactory();
        const httpAgent = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        const httpsAgent = agentFactory({ url: new URL('https://elastic-node-1:9200') });
        expect(httpAgent).toEqual(mockedHttpAgent);
        expect(httpsAgent).toEqual(mockedHttpsAgent);
      });

      it('takes into account the provided configurations', () => {
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory = agentManager.getAgentFactory({
          maxTotalSockets: 1024,
          scheduling: 'fifo',
        });
        agentFactory({ url: new URL('http://elastic-node-1:9200') });
        const agentFactory2 = agentManager.getAgentFactory({
          maxFreeSockets: 10,
          scheduling: 'lifo',
        });
        agentFactory2({ url: new URL('http://elastic-node-2:9200') });
        expect(HttpAgent).toBeCalledTimes(2);
        expect(HttpAgent).toBeCalledWith({
          maxTotalSockets: 1024,
          scheduling: 'fifo',
        });
        expect(HttpAgent).toBeCalledWith({
          maxFreeSockets: 10,
          scheduling: 'lifo',
        });
      });

      it('provides Agents that match the URLs protocol', () => {
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory = agentManager.getAgentFactory();
        agentFactory({ url: new URL('http://elastic-node-1:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(0);
        agentFactory({ url: new URL('https://elastic-node-3:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(1);
      });

      it('provides the same Agent if URLs use the same protocol', () => {
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory = agentManager.getAgentFactory();
        const agent1 = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        const agent2 = agentFactory({ url: new URL('http://elastic-node-2:9200') });
        const agent3 = agentFactory({ url: new URL('https://elastic-node-3:9200') });
        const agent4 = agentFactory({ url: new URL('https://elastic-node-4:9200') });

        expect(agent1).toEqual(agent2);
        expect(agent1).not.toEqual(agent3);
        expect(agent3).toEqual(agent4);
      });

      it('dereferences an agent instance when the agent is closed', () => {
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory = agentManager.getAgentFactory();
        const agent = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        // eslint-disable-next-line dot-notation
        expect(agentManager['agents'].has(agent)).toEqual(true);
        agent.destroy();
        // eslint-disable-next-line dot-notation
        expect(agentManager['agents'].has(agent)).toEqual(false);
      });
    });

    describe('two agent factories', () => {
      it('never provide the same Agent instance even if they use the same type', () => {
        const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
        const agentFactory1 = agentManager.getAgentFactory();
        const agentFactory2 = agentManager.getAgentFactory();
        const agent1 = agentFactory1({ url: new URL('http://elastic-node-1:9200') });
        const agent2 = agentFactory2({ url: new URL('http://elastic-node-1:9200') });
        expect(agent1).not.toEqual(agent2);
      });
    });
  });

  describe('#getAgentsStats()', () => {
    it('returns the stats of the agents', () => {
      const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
      const metrics: ElasticsearchClientsMetrics = {
        totalQueuedRequests: 0,
        totalIdleSockets: 100,
        totalActiveSockets: 400,
      };
      getAgentsSocketsStatsMock.mockReturnValue(metrics);

      expect(agentManager.getAgentsStats()).toStrictEqual(metrics);
    });

    it('warns when there are queued requests (requests unassigned to any socket)', () => {
      const agentManager = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
      const metrics: ElasticsearchClientsMetrics = {
        totalQueuedRequests: 2,
        totalIdleSockets: 100, // There may be idle sockets when many clients are initialized. It should not be taken as an indicator of health.
        totalActiveSockets: 400,
      };
      getAgentsSocketsStatsMock.mockReturnValue(metrics);

      expect(agentManager.getAgentsStats()).toStrictEqual(metrics);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'There are 2 queued requests. If this number is constantly high, consider scaling Kibana horizontally or increasing "elasticsearch.maxSockets" in the config.'
      );
    });
  });
});
