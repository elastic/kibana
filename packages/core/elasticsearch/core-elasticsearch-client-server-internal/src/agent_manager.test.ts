/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AgentManager } from './agent_manager';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

jest.mock('http');
jest.mock('https');

describe('AgentManager', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    const HttpAgentMock = HttpAgent as jest.Mock<HttpAgent>;
    const HttpsAgentMock = HttpsAgent as jest.Mock<HttpsAgent>;
    HttpAgentMock.mockClear();
    HttpsAgentMock.mockClear();
  });

  describe('provides agent factories', () => {
    it('with a valid default configuration', () => {
      const agentManager = new AgentManager(logger);
      const agentFactory = agentManager.getAgentFactory('test');
      agentFactory({ url: new URL('http://elastic-node-1:9200') });
      expect(HttpAgent).toBeCalledTimes(1);
      expect(HttpAgent).toBeCalledWith({
        keepAlive: true,
        keepAliveMsecs: 50000,
        maxFreeSockets: 256,
        maxSockets: 256,
        scheduling: 'lifo',
      });
    });

    it('takes into account the configuration provided in the constructor', () => {
      const agentManager = new AgentManager(logger);
      const agentFactory = agentManager.getAgentFactory('test', {
        maxSockets: 1024,
        scheduling: 'fifo',
      });
      agentFactory({ url: new URL('http://elastic-node-1:9200') });
      expect(HttpAgent).toBeCalledTimes(1);
      expect(HttpAgent).toBeCalledWith({
        keepAlive: true,
        keepAliveMsecs: 50000,
        maxFreeSockets: 256,
        maxSockets: 1024,
        scheduling: 'fifo',
      });
    });

    it('which are different at each call', () => {
      const agentManager = new AgentManager(logger);
      const agentFactory1 = agentManager.getAgentFactory('test');
      const agentFactory2 = agentManager.getAgentFactory('test');
      expect(agentFactory1).not.toEqual(agentFactory2);
    });

    it('throws an error when an Agent factory is requested using undici params', () => {
      const agentManager = new AgentManager(logger);
      expect(() => {
        agentManager.getAgentFactory('anotherTest', { keepAliveTimeout: 2000 });
      }).toThrowError();
    });

    describe('when configured with a custom factory', () => {
      it('uses the provided factory', () => {
        const customAgent = new HttpsAgent({ maxSockets: 32 });
        expect(HttpsAgent).toBeCalledTimes(1);
        const factory = () => customAgent;
        const agentManager = new AgentManager(logger);
        const agentFactory = agentManager.getAgentFactory('test', factory);
        const agent = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        expect(HttpsAgent).toBeCalledTimes(1);
        expect(agent).toEqual(customAgent);
      });
    });

    describe('one agent factory', () => {
      it('provides Agents that match the URLs protocol', () => {
        const agentManager = new AgentManager(logger);
        const agentFactory = agentManager.getAgentFactory('test');
        agentFactory({ url: new URL('http://elastic-node-1:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(0);
        agentFactory({ url: new URL('https://elastic-node-3:9200') });
        expect(HttpAgent).toHaveBeenCalledTimes(1);
        expect(HttpsAgent).toHaveBeenCalledTimes(1);
      });

      it('provides the same Agent iif URLs use the same protocol', () => {
        const agentManager = new AgentManager(logger);
        const agentFactory = agentManager.getAgentFactory('test');
        const agent1 = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        const agent2 = agentFactory({ url: new URL('http://elastic-node-2:9200') });
        const agent3 = agentFactory({ url: new URL('https://elastic-node-3:9200') });
        const agent4 = agentFactory({ url: new URL('https://elastic-node-4:9200') });

        expect(agent1).toEqual(agent2);
        expect(agent1).not.toEqual(agent3);
        expect(agent3).toEqual(agent4);
      });

      it('dereferences an agent instance when the agent is closed', () => {
        const agentManager = new AgentManager(logger);
        const agentFactory = agentManager.getAgentFactory('test');
        const agent = agentFactory({ url: new URL('http://elastic-node-1:9200') });
        // eslint-disable-next-line dot-notation
        expect(agentManager['agentStore']['test']['http:'][0]).toEqual(agent);
        agent.destroy();
        // eslint-disable-next-line dot-notation
        expect(agentManager['agentStore']['test']['http:'][0]).toBeUndefined();
      });
    });

    describe('two agent factories', () => {
      it('never provide the same Agent instance even if they use the same type', () => {
        const agentManager = new AgentManager(logger);
        const agentFactory1 = agentManager.getAgentFactory('test');
        const agentFactory2 = agentManager.getAgentFactory('test');
        const agent1 = agentFactory1({ url: new URL('http://elastic-node-1:9200') });
        const agent2 = agentFactory2({ url: new URL('http://elastic-node-1:9200') });
        expect(agent1).not.toEqual(agent2);
      });
    });
  });
});
