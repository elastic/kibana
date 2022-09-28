/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AgentManager } from '@kbn/core-elasticsearch-client-server-internal';

export const AgentManagerMock: typeof AgentManager = jest.fn(() => ({
  getAgentFactory: jest.fn(),
  getAgents: jest.fn(),
  agentOptions: {},
  agents: [],
}));

jest.doMock('@kbn/core-elasticsearch-client-server-internal', () => {
  const actual = jest.requireActual('@kbn/core-elasticsearch-client-server-internal');
  return {
    ...actual,
    AgentManager: AgentManagerMock,
  };
});
