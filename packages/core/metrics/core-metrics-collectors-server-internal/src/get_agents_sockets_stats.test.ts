/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Socket } from 'net';
import { Agent, IncomingMessage } from 'http';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';
import { getHttpAgentMock, getHttpsAgentMock } from './get_agents_sockets_stats.test.mocks';

jest.mock('net');

const mockSocket = new Socket();
const mockIncomingMessage = new IncomingMessage(mockSocket);

describe('getAgentsSocketsStats()', () => {
  it('extracts aggregated stats from the specified agents', () => {
    const agent1 = getHttpAgentMock({
      sockets: {
        node1: [mockSocket, mockSocket, mockSocket],
        node2: [mockSocket],
      },
      freeSockets: {
        node1: [mockSocket],
        node3: [mockSocket, mockSocket, mockSocket, mockSocket],
      },
      requests: {
        node1: [mockIncomingMessage, mockIncomingMessage],
      },
    });

    const agent2 = getHttpAgentMock({
      sockets: {
        node1: [mockSocket, mockSocket, mockSocket],
        node4: [mockSocket],
      },
      freeSockets: {
        node3: [mockSocket, mockSocket, mockSocket, mockSocket],
      },
      requests: {
        node4: [mockIncomingMessage, mockIncomingMessage, mockIncomingMessage, mockIncomingMessage],
      },
    });

    const stats = getAgentsSocketsStats(new Set<Agent>([agent1, agent2]));
    expect(stats).toEqual({
      averageActiveSocketsPerNode: 2.6666666666666665,
      averageIdleSocketsPerNode: 4.5,
      connectedNodes: 4,
      mostActiveNodeSockets: 6,
      mostIdleNodeSockets: 8,
      nodesWithActiveSockets: 3,
      nodesWithIdleSockets: 2,
      protocol: 'http',
      totalActiveSockets: 8,
      totalIdleSockets: 9,
      totalQueuedRequests: 6,
    });
  });

  it('takes into account Agent types to determine the `protocol`', () => {
    const httpAgent = getHttpAgentMock({
      sockets: { node1: [mockSocket] },
      freeSockets: {},
      requests: {},
    });

    const httpsAgent = getHttpsAgentMock({
      sockets: { node1: [mockSocket] },
      freeSockets: {},
      requests: {},
    });

    const noAgents = new Set<Agent>();
    const httpAgents = new Set<Agent>([httpAgent, httpAgent]);
    const httpsAgents = new Set<Agent>([httpsAgent, httpsAgent]);
    const mixedAgents = new Set<Agent>([httpAgent, httpsAgent]);

    expect(getAgentsSocketsStats(noAgents).protocol).toEqual('none');
    expect(getAgentsSocketsStats(httpAgents).protocol).toEqual('http');
    expect(getAgentsSocketsStats(httpsAgents).protocol).toEqual('https');
    expect(getAgentsSocketsStats(mixedAgents).protocol).toEqual('mixed');
  });

  it('does not take into account those Agents that have not had any connection to any node', () => {
    const pristineAgentProps = {
      sockets: {},
      freeSockets: {},
      requests: {},
    };
    const agent1 = getHttpAgentMock(pristineAgentProps);
    const agent2 = getHttpAgentMock(pristineAgentProps);
    const agent3 = getHttpAgentMock(pristineAgentProps);

    const stats = getAgentsSocketsStats(new Set<Agent>([agent1, agent2, agent3]));

    expect(stats).toEqual({
      averageActiveSocketsPerNode: 0,
      averageIdleSocketsPerNode: 0,
      connectedNodes: 0,
      mostActiveNodeSockets: 0,
      mostIdleNodeSockets: 0,
      nodesWithActiveSockets: 0,
      nodesWithIdleSockets: 0,
      protocol: 'none',
      totalActiveSockets: 0,
      totalIdleSockets: 0,
      totalQueuedRequests: 0,
    });
  });

  it('takes into account those Agents that have hold mappings to one or more nodes, but that do not currently have any pending requests, active connections or idle connections', () => {
    const emptyAgentProps = {
      sockets: {
        node1: [],
      },
      freeSockets: {
        node2: [],
      },
      requests: {
        node3: [],
      },
    };

    const agent1 = getHttpAgentMock(emptyAgentProps);
    const agent2 = getHttpAgentMock(emptyAgentProps);

    const stats = getAgentsSocketsStats(new Set<Agent>([agent1, agent2]));

    expect(stats).toEqual({
      averageActiveSocketsPerNode: 0,
      averageIdleSocketsPerNode: 0,
      connectedNodes: 3,
      mostActiveNodeSockets: 0,
      mostIdleNodeSockets: 0,
      nodesWithActiveSockets: 0,
      nodesWithIdleSockets: 0,
      protocol: 'http',
      totalActiveSockets: 0,
      totalIdleSockets: 0,
      totalQueuedRequests: 0,
    });
  });
});
