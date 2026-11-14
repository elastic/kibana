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

import { WorkflowsExecutionEnginePlugin } from './plugin';
import {
  mockDataClientBundleInitSetup,
  mockDataClientBundleInitStart,
} from './test_utils/data_client_jest_mock';

jest.mock('./repositories/data_access_layer', () => {
  const actual = jest.requireActual('./repositories/data_access_layer');
  const { createDataClientJestMock: createDataAccessMock } = jest.requireActual(
    './test_utils/data_client_jest_mock'
  );
  return {
    ...actual,
    createDataClientBundle: jest.fn(() => createDataAccessMock()),
  };
});

const createPlugin = (): WorkflowsExecutionEnginePlugin => {
  const initializerContext = coreMock.createPluginInitializerContext({
    logging: { console: false },
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    storage: { source: 'plain_index', dataRetention: '90d' },
  });
  return new WorkflowsExecutionEnginePlugin(initializerContext);
};

describe('WorkflowsExecutionEnginePlugin — executions DAL lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataClientBundleInitSetup.mockResolvedValue(undefined);
    mockDataClientBundleInitStart.mockResolvedValue(undefined);
  });

  it('calls initSetup during setup', () => {
    const plugin = createPlugin();
    const setup = coreMock.createSetup() as any;
    setup.dataStreams = { registerDataStream: jest.fn() };
    plugin.setup(setup, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    expect(mockDataClientBundleInitSetup).toHaveBeenCalledTimes(1);
    expect(mockDataClientBundleInitStart).not.toHaveBeenCalled();
  });

  it('calls initStart and exposes the execution data access during start', () => {
    const plugin = createPlugin();
    const setup = coreMock.createSetup() as any;
    setup.dataStreams = { registerDataStream: jest.fn() };
    plugin.setup(setup, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    const start = coreMock.createStart() as any;
    start.dataStreams = { initializeClient: jest.fn().mockResolvedValue(undefined) };
    const startContract = plugin.start(start, {
      taskManager: taskManagerMock.createStart(),
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });

    expect(mockDataClientBundleInitStart).toHaveBeenCalledTimes(1);
    expect(startContract.__internalStorage.workflowExecutionsDataClient).toBeDefined();
    expect(startContract.__internalStorage.stepExecutionsDataClient).toBeDefined();
    expect(startContract.__internalStorage.executionsIoDataClient).toBeDefined();
    plugin.stop();
  });
});
