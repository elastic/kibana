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
import { WorkflowsExecutionEnginePlugin } from './plugin';

jest.mock('./repositories/data_access_layer', () => {
  const actual = jest.requireActual('./repositories/data_access_layer');
  const { createDataClientJestMock } = jest.requireActual('./test_utils/data_client_jest_mock');
  return {
    ...actual,
    createDataClientBundle: jest.fn(() => createDataClientJestMock()),
  };
});
jest.mock('./lib/check_license', () => ({
  checkLicense: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./lib/get_user', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue('test-user'),
}));

const mockBulkCreateWorkflowExecutions = jest.fn();
const mockCreateWorkflowExecution = jest.fn();
const mockBulkUpdateWorkflowExecutions = jest.fn();
jest.mock('./repositories/workflow_execution_repository', () => ({
  WorkflowExecutionRepository: jest.fn().mockImplementation(() => ({
    bulkCreateWorkflowExecutions: mockBulkCreateWorkflowExecutions,
    createWorkflowExecution: mockCreateWorkflowExecution,
    bulkUpdateWorkflowExecutions: mockBulkUpdateWorkflowExecutions,
  })),
}));

const mockGetWorkflowExecutionStates = jest.fn();
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    WorkflowRepository: jest.fn().mockImplementation(() => ({
      getWorkflow: jest.fn().mockResolvedValue(undefined),
      getWorkflowExecutionStates: mockGetWorkflowExecutionStates,
      isWorkflowEnabled: jest.fn().mockResolvedValue(true),
    })),
  };
});

jest.mock('./concurrency/concurrency_manager', () => ({
  ConcurrencyManager: jest.fn().mockImplementation(() => ({
    checkConcurrency: jest.fn().mockResolvedValue(true),
    evaluateConcurrencyKey: jest.fn().mockReturnValue(null),
  })),
}));

const createWorkflow = (id: string): WorkflowExecutionEngineModel => ({
  id,
  name: `Workflow ${id}`,
  enabled: true,
  spaceId: 'default',
  definition: {
    name: `Workflow ${id}`,
    enabled: true,
    version: '1',
    triggers: [{ type: 'manual' }],
    steps: [],
  },
  yaml: `name: Workflow ${id}`,
  isTestRun: false,
});

describe('execution labels', () => {
  let plugin: WorkflowsExecutionEnginePlugin;
  let pluginSetup: ReturnType<WorkflowsExecutionEnginePlugin['setup']>;
  let pluginStart: Awaited<ReturnType<WorkflowsExecutionEnginePlugin['start']>>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  const request = {} as KibanaRequest;
  const labels = { 'hunt.kind': 'manual_session', 'hunt.session_id': 's1' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWorkflowExecution.mockResolvedValue({ reusedExisting: false });
    mockBulkUpdateWorkflowExecutions.mockResolvedValue(undefined);
    mockBulkCreateWorkflowExecutions.mockImplementation(async (executions: Array<{ id: string }>) =>
      executions.map(({ id }) => ({ id }))
    );
    mockGetWorkflowExecutionStates.mockResolvedValue(new Map());

    plugin = new WorkflowsExecutionEnginePlugin(
      coreMock.createPluginInitializerContext({
        logging: { console: false },
        storage: { source: 'plain_index', dataRetention: '90d' },
        eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
      })
    );
    pluginSetup = plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    taskManager = taskManagerMock.createStart();
    taskManager.bulkSchedule.mockImplementation(async (tasks) => tasks as any);
    pluginStart = plugin.start(coreMock.createStart(), {
      taskManager,
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });
  });

  describe('registerExecutionLabelNamespace', () => {
    it('is idempotent for the same owner and rejects another owner', () => {
      pluginSetup.registerExecutionLabelNamespace('hunt', 'alertzero');
      expect(() => pluginSetup.registerExecutionLabelNamespace('hunt', 'alertzero')).not.toThrow();
      expect(() => pluginSetup.registerExecutionLabelNamespace('hunt', 'other')).toThrow(
        'already registered to "alertzero"'
      );
    });
  });

  describe('executeWorkflow', () => {
    beforeEach(() => {
      pluginSetup.registerExecutionLabelNamespace('hunt', 'alertzero');
    });

    it('persists normalized labels under the deterministic id and schedules the task', async () => {
      const result = await pluginStart.executeWorkflow(
        createWorkflow('wf'),
        { spaceId: 'default' },
        request,
        { executionId: 'det-1', labels, labelOwnerId: 'alertzero' }
      );

      expect(result).toEqual({ workflowExecutionId: 'det-1' });
      expect(mockCreateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'det-1', labels }),
        expect.anything()
      );
      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    });

    it('returns an existing deterministic execution without scheduling again', async () => {
      mockCreateWorkflowExecution.mockResolvedValue({ reusedExisting: true });

      const result = await pluginStart.executeWorkflow(
        createWorkflow('wf'),
        { spaceId: 'default' },
        request,
        { executionId: 'det-1', labels, labelOwnerId: 'alertzero' }
      );

      expect(result).toEqual({ workflowExecutionId: 'det-1', reusedExisting: true });
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('still schedules a random-id execution that recovered a transient create', async () => {
      mockCreateWorkflowExecution.mockResolvedValue({ reusedExisting: true });

      const result = await pluginStart.executeWorkflow(
        createWorkflow('wf'),
        { spaceId: 'default' },
        request
      );

      expect(result.reusedExisting).toBeUndefined();
      expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['an unregistered namespace', { 'nope.kind': 'x' }, 'alertzero', 'not registered'],
      ['another plugin owner', { 'hunt.kind': 'x' }, 'someone_else', 'owned by "alertzero"'],
      ['an invalid key', { 'Hunt.Kind': 'x' }, 'alertzero', 'namespaced key'],
    ])('rejects labels with %s before writing', async (_, badLabels, owner, message) => {
      await expect(
        pluginStart.executeWorkflow(createWorkflow('wf'), { spaceId: 'default' }, request, {
          labels: badLabels,
          labelOwnerId: owner,
        })
      ).rejects.toThrow(message);
      expect(mockCreateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('requires an owner with labels and labels with a deterministic id', async () => {
      await expect(
        pluginStart.executeWorkflow(createWorkflow('wf'), { spaceId: 'default' }, request, {
          labels,
        })
      ).rejects.toThrow('label owner id');
      await expect(
        pluginStart.executeWorkflow(createWorkflow('wf'), { spaceId: 'default' }, request, {
          executionId: 'det-1',
        })
      ).rejects.toThrow('requires identity labels');
      expect(mockCreateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('scheduleWorkflow', () => {
    beforeEach(() => {
      pluginSetup.registerExecutionLabelNamespace('hunt', 'alertzero');
    });

    it('returns an existing deterministic execution without scheduling again', async () => {
      mockCreateWorkflowExecution.mockResolvedValue({ reusedExisting: true });

      const result = await pluginStart.scheduleWorkflow(
        createWorkflow('wf'),
        { spaceId: 'default' },
        request,
        { executionId: 'det-2', labels, labelOwnerId: 'alertzero' }
      );

      expect(result).toEqual({ workflowExecutionId: 'det-2', reusedExisting: true });
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });
  });

  describe('bulkScheduleWorkflow', () => {
    beforeEach(() => {
      pluginSetup.registerExecutionLabelNamespace('hunt', 'alertzero');
    });

    it('stores labels per item and reports a bad item without failing the others', async () => {
      await pluginStart
        .bulkScheduleWorkflow(
          [
            {
              workflow: { ...createWorkflow('a'), isEphemeral: true },
              context: { spaceId: 'default' },
              labels,
              labelOwnerId: 'alertzero',
            },
            {
              workflow: { ...createWorkflow('b'), isEphemeral: true },
              context: { spaceId: 'default' },
            },
            {
              workflow: { ...createWorkflow('c'), isEphemeral: true },
              context: { spaceId: 'default' },
              labels: { 'nope.kind': 'x' },
              labelOwnerId: 'alertzero',
            },
          ],
          request
        )
        .then((results) => {
          expect(results[2]).toEqual({
            status: 'error',
            error: { message: expect.stringContaining('not registered') },
          });
        });

      const created = mockBulkCreateWorkflowExecutions.mock.calls[0][0] as Array<{
        workflowId: string;
        labels?: Record<string, string>;
      }>;
      expect(created.map(({ workflowId }) => workflowId)).toEqual(['a', 'b']);
      expect(created[0].labels).toEqual(labels);
      expect(created[1]).not.toHaveProperty('labels');
    });
  });
});
