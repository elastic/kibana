/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

    const agent2 = getHttpsAgentMock({
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
      totalActiveSockets: 8,
      totalIdleSockets: 9,
      totalQueuedRequests: 6,
    });
  });
});
