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

jest.mock('net');
jest.mock('http');
jest.mock('https');

const configProperties = {
  maxSockets: 10,
  maxFreeSockets: 10,
  maxTotalSockets: 100,
  destroy: jest.fn(),
};

const HttpAgentMock = Agent as jest.MockedClass<typeof Agent>;

describe('getAgentsSocketsStats()', () => {
  it('extracts aggregated stats from the specified agents', () => {
    const mockSocket = new Socket();
    const mockIncomingMessage = new IncomingMessage(mockSocket);

    HttpAgentMock.mockImplementationOnce(() => {
      return {
        ...configProperties,
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
      };
    });

    HttpAgentMock.mockImplementationOnce(() => {
      return {
        ...configProperties,
        sockets: {
          node1: [mockSocket, mockSocket, mockSocket],
          node4: [mockSocket],
        },
        freeSockets: {
          node3: [mockSocket, mockSocket, mockSocket, mockSocket],
        },
        requests: {
          node4: [
            mockIncomingMessage,
            mockIncomingMessage,
            mockIncomingMessage,
            mockIncomingMessage,
          ],
        },
      };
    });

    const agents = new Set<Agent>([new Agent(), new Agent()]);

    const stats = getAgentsSocketsStats(agents);
    expect(stats).toMatchInlineSnapshot(`
      Object {
        "activeSockets": 8,
        "activeSocketsPerNode": 2.6666666666666665,
        "agents": 2,
        "connectedNodes": 4,
        "idleSockets": 9,
        "idleSocketsPerNode": 4.5,
        "mostActiveNodeSockets": 6,
        "mostIdleNodeSockets": 8,
        "nodesWithActiveSockets": 3,
        "nodesWithIdleSockets": 2,
        "queuedRequests": 6,
      }
    `);
  });
});
