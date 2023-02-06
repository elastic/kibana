/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AgentManager } from '@kbn/core-elasticsearch-client-server-internal';

export const MockClusterClient = jest.fn();
export const MockAgentManager: jest.MockedClass<typeof AgentManager> = jest.fn().mockReturnValue({
  getAgents: jest.fn(),
  getAgentFactory: jest.fn(),
});

jest.mock('@kbn/core-elasticsearch-client-server-internal', () => ({
  ClusterClient: MockClusterClient,
  AgentManager: MockAgentManager,
}));

export const isScriptingEnabledMock = jest.fn();
jest.doMock('./is_scripting_enabled', () => ({
  isInlineScriptingEnabled: isScriptingEnabledMock,
}));
