/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionStatus, NonTerminalExecutionStatuses } from '@kbn/workflows';
import { checkAndSkipIfExistingScheduledExecution } from './execution_functions';
import type { ExecutionStateRepository } from './repositories/execution_state_repository/execution_state_repository';

describe('checkAndSkipIfExistingScheduledExecution', () => {
  let executionStateRepository: jest.Mocked<ExecutionStateRepository>;
  let logger: Logger;
  let workflow: WorkflowExecutionEngineModel;
  let currentTaskInstance: ConcreteTaskInstance;
  const spaceId = 'default';
  const baseRunAt = new Date('2024-01-01T10:00:00Z');

  const createMockTaskInstance = (
    overrides?: Partial<ConcreteTaskInstance>
  ): ConcreteTaskInstance => {
    return {
      id: 'task-id',
      taskType: 'workflow:scheduled',
      params: { workflowId: workflow.id, spaceId, triggerType: 'scheduled' },
      state: {},
      attempts: 1,
      runAt: baseRunAt,
      scheduledAt: baseRunAt,
      startedAt: baseRunAt,
      retryAt: null,
      status: TaskStatus.Running,
      ownerId: 'kibana-instance-id',
      ...overrides,
    } as ConcreteTaskInstance;
  };

  beforeEach(() => {
    executionStateRepository = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({}),
      getStepExecutions: jest.fn().mockResolvedValue({}),
      bulkCreate: jest.fn(),
      bulkUpsert: jest.fn(),
      bulkUpdate: jest.fn(),
      deleteTerminalExecutions: jest.fn(),
      searchWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    } as unknown as jest.Mocked<ExecutionStateRepository>;

    logger = loggingSystemMock.create().get();
    workflow = {
      id: 'test-workflow-id',
      name: 'Test Workflow',
      enabled: true,
      definition: {
        name: 'Test Workflow',
        enabled: false,
        version: '1',
        triggers: [
          {
            type: 'scheduled',
            with: {
              every: '1h',
            },
          },
        ],
        steps: [],
      },
      yaml: 'test yaml',
      isTestRun: false,
    };

    currentTaskInstance = createMockTaskInstance();
    jest.clearAllMocks();
  });

  describe('when no existing non-terminal scheduled execution exists', () => {
    it('should return false and not create a skipped execution', async () => {
      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [],
        total: 0,
      });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(executionStateRepository.searchWorkflowExecutions).toHaveBeenCalledWith({
        filter: {
          spaceId,
          workflowId: workflow.id,
          statuses: [...NonTerminalExecutionStatuses],
          triggeredBy: 'scheduled',
        },
        pagination: { size: 1, from: 0 },
        fields: ['id', 'taskRunAt'],
      });
      expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('when existing non-terminal scheduled execution exists', () => {
    it('should create a SKIPPED execution and return true', async () => {
      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
          },
        ],
        total: 1,
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true);
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledTimes(1);
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          spaceId,
          workflowId: workflow.id,
          status: ExecutionStatus.SKIPPED,
          triggeredBy: 'scheduled',
        }),
      ]);
    });

    it('should not skip when only terminal status executions exist', async () => {
      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [],
        total: 0,
      });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('taskRunAt comparison logic', () => {
    it('should mark execution as FAILED and proceed when taskRunAt matches AND attempts > 1 (stale execution from task recovery)', async () => {
      const matchingRunAt = baseRunAt.toISOString();

      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
            taskRunAt: matchingRunAt,
          },
        ],
        total: 1,
      } as any);

      const retryTaskInstance = createMockTaskInstance({ attempts: 2 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        retryTaskInstance,
        logger
      );

      expect(result).toBe(false);
      expect(executionStateRepository.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'existing-execution-id',
          status: ExecutionStatus.FAILED,
          error: expect.objectContaining({
            type: 'TaskRecoveryError',
          }),
        }),
      ]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Found stale execution'));
      expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
    });

    it('should skip (not mark as failed) when taskRunAt matches BUT attempts = 1 (first attempt, execution from this run)', async () => {
      const matchingRunAt = baseRunAt.toISOString();

      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
            taskRunAt: matchingRunAt,
          },
        ],
        total: 1,
      } as any);

      const firstAttemptTaskInstance = createMockTaskInstance({ attempts: 1 });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        firstAttemptTaskInstance,
        logger
      );

      expect(result).toBe(true);
      expect(executionStateRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          status: ExecutionStatus.SKIPPED,
        }),
      ]);
    });

    it('should skip when taskRunAt differs (legitimate concurrent execution from different scheduled run)', async () => {
      const differentRunAt = new Date('2024-01-01T09:00:00Z').toISOString();

      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
            taskRunAt: differentRunAt,
          },
        ],
        total: 1,
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true);
      expect(executionStateRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          status: ExecutionStatus.SKIPPED,
        }),
      ]);
    });

    it('should skip when execution has no taskRunAt (legacy execution)', async () => {
      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
          },
        ],
        total: 1,
      } as any);

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        currentTaskInstance,
        logger
      );

      expect(result).toBe(true);
      expect(executionStateRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalled();
    });

    it('should skip when current task has no runAt', async () => {
      executionStateRepository.searchWorkflowExecutions.mockResolvedValue({
        results: [
          {
            id: 'existing-execution-id',
            taskRunAt: baseRunAt.toISOString(),
          },
        ],
        total: 1,
      } as any);

      const taskInstanceWithoutRunAt = createMockTaskInstance({ runAt: undefined as any });

      const result = await checkAndSkipIfExistingScheduledExecution(
        workflow,
        spaceId,
        executionStateRepository,
        taskInstanceWithoutRunAt,
        logger
      );

      expect(result).toBe(true);
      expect(executionStateRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(executionStateRepository.bulkUpsert).toHaveBeenCalled();
    });
  });
});

describe('elastic-apm-node dynamic import pattern', () => {
  const mockStartSpan = jest.fn().mockReturnValue({ end: jest.fn() });
  const mockSetLabel = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.mock('elastic-apm-node', () => ({
      __esModule: true,
      default: {
        startSpan: mockStartSpan,
        currentTransaction: { setLabel: mockSetLabel },
      },
    }));
    mockStartSpan.mockClear();
    mockSetLabel.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should access startSpan on the default export when using destructured import', async () => {
    const { default: apm } = await import('elastic-apm-node');

    expect(typeof apm.startSpan).toBe('function');

    const span = apm.startSpan('test span', 'workflow', 'execution');
    expect(span).toBeDefined();
    expect(mockStartSpan).toHaveBeenCalledWith('test span', 'workflow', 'execution');
    span?.end();
  });

  it('should access currentTransaction on the default export when using destructured import', async () => {
    const { default: apm } = await import('elastic-apm-node');

    expect(apm.currentTransaction).toBeDefined();
    apm.currentTransaction?.setLabel('test_key', 'test_value');
    expect(mockSetLabel).toHaveBeenCalledWith('test_key', 'test_value');
  });

  it('should NOT have startSpan on module namespace (regression: non-destructured import)', async () => {
    const moduleNamespace = await import('elastic-apm-node');

    expect((moduleNamespace as Record<string, unknown>).startSpan).toBeUndefined();

    expect(typeof moduleNamespace.default.startSpan).toBe('function');
  });
});
