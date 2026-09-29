/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedClass } from 'vitest';

import type { AgentManager } from '@kbn/core-elasticsearch-client-server-internal';

export const MockClusterClient = vi.fn();
export const MockAgentManager: MockedClass<typeof AgentManager> = vi.fn().mockReturnValue({
  getAgentsStats: vi.fn(),
  getAgentFactory: vi.fn(),
});

vi.mock('@kbn/core-elasticsearch-client-server-internal', () => {
      const mocked = {
      ClusterClient: MockClusterClient,
      AgentManager: MockAgentManager,
      getRequestHandlerFactory: vi.fn().mockReturnValue(vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

export const isScriptingEnabledMock = vi.fn();
vi.doMock('./is_scripting_enabled', () => {
      const mocked = {
      isInlineScriptingEnabled: isScriptingEnabledMock,
    };
      return { ...mocked, default: mocked };
    });

export const getClusterInfoMock = vi.fn();
vi.doMock('./get_cluster_info', () => {
      const mocked = {
      getClusterInfo$: getClusterInfoMock,
    };
      return { ...mocked, default: mocked };
    });
