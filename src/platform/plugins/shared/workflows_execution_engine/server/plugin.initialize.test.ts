/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import {
  createExecutionsDalJestMock,
  mockExecutionsDalInitSetup,
  mockExecutionsDalInitStart,
} from './test_utils/executions_dal_jest_mock';

jest.mock('@kbn/workflows/server/data_access_layer', () => {
  const actual = jest.requireActual('@kbn/workflows/server/data_access_layer');
  const { createExecutionsDalJestMock: createDalMock } = jest.requireActual(
    './test_utils/executions_dal_jest_mock'
  );
  return {
    ...actual,
    createExecutionsDal: jest.fn(() => createDalMock()),
  };
});

import { WorkflowsExecutionEnginePlugin } from './plugin';

const createPlugin = (): WorkflowsExecutionEnginePlugin => {
  const initializerContext = coreMock.createPluginInitializerContext({
    logging: { console: false },
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
  });
  return new WorkflowsExecutionEnginePlugin(initializerContext);
};

describe('WorkflowsExecutionEnginePlugin — executions DAL lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecutionsDalInitSetup.mockResolvedValue(undefined);
    mockExecutionsDalInitStart.mockResolvedValue(undefined);
  });

  it('calls initSetup during setup', () => {
    const plugin = createPlugin();
    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    expect(mockExecutionsDalInitSetup).toHaveBeenCalledTimes(1);
    expect(mockExecutionsDalInitStart).not.toHaveBeenCalled();
  });

  it('calls initStart during start', () => {
    const plugin = createPlugin();
    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    plugin.start(coreMock.createStart(), {
      taskManager: taskManagerMock.createStart(),
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });

    expect(mockExecutionsDalInitStart).toHaveBeenCalledTimes(1);
  });
});
