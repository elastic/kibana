/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

jest.mock('./lib/check_license', () => ({
  checkLicense: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./lib/get_user', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue('test-user'),
}));

const mockCreateWorkflowExecution = jest.fn().mockResolvedValue(undefined);
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    createWorkflowExecution: mockCreateWorkflowExecution,
    getWorkflowExecutionById: jest.fn().mockResolvedValue(null),
    bulkCreateWorkflowExecutions: jest.fn(),
  })),
}));

const mockIsWorkflowEnabled = jest.fn().mockResolvedValue(true);
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: jest.fn().mockImplementation(() => ({
      areWorkflowsEnabled: jest.fn().mockResolvedValue(new Map()),
      isWorkflowEnabled: mockIsWorkflowEnabled,
    })),
  };
});

const mockCheckConcurrency = jest.fn().mockResolvedValue(true);
jest.mock('./concurrency/concurrency_manager', () => ({
  ConcurrencyManager: jest.fn().mockImplementation(() => ({
    checkConcurrency: mockCheckConcurrency,
    evaluateConcurrencyKey: jest.fn().mockReturnValue(null),
  })),
}));

jest.mock('./concurrency/concurrency_queue_drainer', () => ({
  maybeDrainConcurrencyQueueBeforeEnqueue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./lib/validate_workflow_inputs', () => ({
  validateWorkflowInputs: jest.fn().mockResolvedValue(true),
}));

const mockBuildWorkflowExecutionDocument = jest.fn();
jest.mock('./lib/build_workflow_execution_document', () => ({
  buildWorkflowExecutionDocument: (...args: unknown[]) =>
    mockBuildWorkflowExecutionDocument(...args),
}));

import { WorkflowsExecutionEnginePlugin } from './plugin';

const makeMinimalExecution = (overrides: Record<string, unknown> = {}) => ({
  id: 'exec-1',
  workflowId: 'wf-1',
  spaceId: 'default',
  createdAt: new Date().toISOString(),
  concurrencyGroupKey: null,
  ...overrides,
});

const createWorkflow = (
  id: string,
  overrides: Partial<WorkflowExecutionEngineModel> = {}
): WorkflowExecutionEngineModel => ({
  id,
  name: `Workflow ${id}`,
  enabled: true,
  isEphemeral: true,
  definition: {
    name: `Workflow ${id}`,
    enabled: true,
    version: '1',
    triggers: [{ type: 'manual' }],
    steps: [],
  },
  yaml: `name: Workflow ${id}`,
  isTestRun: false,
  ...overrides,
});

describe('executeWorkflow – context passthrough', () => {
  let pluginStart: Awaited<ReturnType<WorkflowsExecutionEnginePlugin['start']>>;
  const request = { isFakeRequest: false } as unknown as KibanaRequest;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsWorkflowEnabled.mockResolvedValue(true);
    mockCheckConcurrency.mockResolvedValue(true);
    mockBuildWorkflowExecutionDocument.mockReturnValue(makeMinimalExecution());

    const initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);

    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    const coreStart = coreMock.createStart();
    pluginStart = plugin.start(coreStart, {
      taskManager: taskManagerMock.createStart(),
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });
  });

  it('passes context through to buildWorkflowExecutionDocument without modification', async () => {
    const inputs = { alertId: 'abc', severity: 'high' };

    await pluginStart.executeWorkflow(
      createWorkflow('wf-1'),
      { spaceId: 'default', inputs },
      request
    );

    // event.inputs aliasing happens in buildWorkflowContext at render time, not here
    expect(mockBuildWorkflowExecutionDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ inputs }),
      })
    );
    // confirm no synthetic event is written into the stored context
    expect(mockBuildWorkflowExecutionDocument).not.toHaveBeenCalledWith(
      expect.objectContaining({ context: expect.objectContaining({ event: expect.anything() }) })
    );
  });

  it('preserves a real event when already present in context', async () => {
    const event = { type: 'alert', id: 'alert-1' };
    const inputs = { foo: 'bar' };

    await pluginStart.executeWorkflow(
      createWorkflow('wf-1'),
      { spaceId: 'default', event, inputs },
      request
    );

    expect(mockBuildWorkflowExecutionDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ event }),
      })
    );
  });
});
