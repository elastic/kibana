/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AgentManager } from './agent_manager';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

jest.mock('http');
jest.mock('https');

const HttpAgentMock = HttpAgent as jest.Mock<HttpAgent>;
const HttpsAgentMock = HttpsAgent as jest.Mock<HttpsAgent>;

describe('AgentManager', () => {
  afterEach(() => {
    HttpAgentMock.mockClear();
    HttpsAgentMock.mockClear();
  });

  describe('#getAgentFactory()', () => {
    it('provides factories which are different at each call', () => {
      const agentManager = new AgentManager();
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
        const agentManager = new AgentManager();
        const agentFactory = agentManager.getAgentFactory();
        const httpAgent = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        const httpsAgent = agentFactory({ url: new URL('https://elastic-node-1:9200') });
        expect(httpAgent).toEqual(mockedHttpAgent);
        expect(httpsAgent).toEqual(mockedHttpsAgent);
      });

      it('takes into account the provided configurations', () => {
        const agentManager = new AgentManager();
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
        const agentManager = new AgentManager();
        const agentFactory = agentManager.getAgentFactory();
        agentFactory({ url: new URL('http://elastic-node-1:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(0);
        agentFactory({ url: new URL('https://elastic-node-3:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(1);
      });

      it('provides the same Agent if URLs use the same protocol', () => {
        const agentManager = new AgentManager();
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
        const agentManager = new AgentManager();
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
        const agentManager = new AgentManager();
        const agentFactory1 = agentManager.getAgentFactory();
        const agentFactory2 = agentManager.getAgentFactory();
        const agent1 = agentFactory1({ url: new URL('http://elastic-node-1:9200') });
        const agent2 = agentFactory2({ url: new URL('http://elastic-node-1:9200') });
        expect(agent1).not.toEqual(agent2);
      });
    });
  });

  describe('#getAgents()', () => {
    it('returns the created HTTP and HTTPs Agent instances', () => {
      const agentManager = new AgentManager();
      const agentFactory1 = agentManager.getAgentFactory();
      const agentFactory2 = agentManager.getAgentFactory();
      const agent1 = agentFactory1({ url: new URL('http://elastic-node-1:9200') });
      const agent2 = agentFactory2({ url: new URL('http://elastic-node-1:9200') });
      const agent3 = agentFactory1({ url: new URL('https://elastic-node-1:9200') });
      const agent4 = agentFactory2({ url: new URL('https://elastic-node-1:9200') });

      const agents = agentManager.getAgents();

      expect(agents.size).toEqual(4);
      expect([...agents]).toEqual(expect.arrayContaining([agent1, agent2, agent3, agent4]));
    });
  });
});
