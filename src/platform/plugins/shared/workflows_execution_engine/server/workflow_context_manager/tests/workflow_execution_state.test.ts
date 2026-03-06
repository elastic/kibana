/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { ExecutionStateRepository } from '../../repositories/execution_state_repository/execution_state_repository';
import { WorkflowExecutionState } from '../workflow_execution_state';

describe('WorkflowExecutionState', () => {
  let underTest: WorkflowExecutionState;
  let executionStateRepository: jest.Mocked<ExecutionStateRepository>;

  beforeEach(() => {
    executionStateRepository = {
      getStepExecutions: jest.fn().mockResolvedValue({}),
      getWorkflowExecutions: jest.fn().mockResolvedValue({}),
      bulkUpsert: jest.fn().mockResolvedValue(undefined),
      bulkUpdate: jest.fn().mockResolvedValue(undefined),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
      searchWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      deleteTerminalExecutions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ExecutionStateRepository>;

    const fakeWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;
    underTest = new WorkflowExecutionState(fakeWorkflowExecution, executionStateRepository);
  });

  it('should initialize with the provided workflow execution', () => {
    const workflowExecution = underTest.getWorkflowExecution();
    expect(workflowExecution).toEqual({
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution);
  });

  it('should update workflow execution', () => {
    const updatedWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    underTest.updateWorkflowExecution(updatedWorkflowExecution);

    expect(underTest.getWorkflowExecution()).toEqual(updatedWorkflowExecution);
  });

  it('should not call executionStateRepository before flush', () => {
    const updatedWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    underTest.updateWorkflowExecution(updatedWorkflowExecution);
    expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should throw error from upsertStep if id is not provided', () => {
    expect(() => underTest.upsertStep({})).toThrowError(
      'WorkflowExecutionState: Step execution must have an ID to be upserted'
    );
  });

  it('should create step execution with assigning workflowRunId, workflowId only in local state', () => {
    const stepExecution = {
      id: 'fake-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution;

    underTest.upsertStep(stepExecution);
    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual({
      id: 'fake-id',
      workflowRunId: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
      stepExecutionIndex: 0,
      globalExecutionIndex: 0,
      spaceId: 'default',
      type: 'step',
    } as EsWorkflowStepExecution);
    expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should create step execution with executionIndex', () => {
    underTest.upsertStep({
      id: 'fake-id-1',
      stepId: 'test-step-execution-id',
    });
    underTest.upsertStep({
      id: 'fake-id-2',
      stepId: 'test-step-execution-id',
    });
    underTest.upsertStep({
      id: 'fake-id-3',
      stepId: 'test-step-execution-id',
    });

    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual(
      expect.objectContaining({
        stepExecutionIndex: 2,
      } as EsWorkflowStepExecution)
    );
    expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should create step execution with globalExecutionIndex', () => {
    underTest.upsertStep({
      id: 'fake-id-1',
      stepId: 'test-step-execution-id',
    });
    underTest.upsertStep({
      id: 'fake-id-2',
      stepId: 'test-step-execution-id-2',
    });
    underTest.upsertStep({
      id: 'fake-id-3',
      stepId: 'test-step-execution-id-3',
    });

    expect(underTest.getLatestStepExecution('test-step-execution-id-3')).toEqual(
      expect.objectContaining({
        globalExecutionIndex: 2,
      } as EsWorkflowStepExecution)
    );
    expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should update step execution only in local state', () => {
    underTest.upsertStep({
      id: 'fake-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution);

    underTest.upsertStep({
      id: 'fake-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.COMPLETED,
      finishedAt: '2025-08-05T20:01:00.000Z',
      executionTimeMs: 60000,
    } as EsWorkflowStepExecution);

    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual(
      expect.objectContaining({
        id: 'fake-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      })
    );
    expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  describe('flush', () => {
    it('should flush workflow execution changes via bulkUpsert', async () => {
      const updatedWorkflowExecution = {
        id: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2025-08-05T20:00:00.000Z',
        finishedAt: '2025-08-05T20:01:00.000Z',
      } as EsWorkflowExecution;

      underTest.updateWorkflowExecution(updatedWorkflowExecution);

      await underTest.flush();

      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-workflow-execution-id',
          status: ExecutionStatus.COMPLETED,
          type: 'workflow',
          stepExecutionIds: [],
        }),
      ]);
    });

    it('should flush new step executions', async () => {
      const stepExecution = {
        id: 'fake-uuid',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution;

      underTest.upsertStep(stepExecution);

      await underTest.flush();

      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'fake-uuid',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-08-05T20:00:00.000Z',
        } as EsWorkflowStepExecution),
      ]);
    });

    it('should flush updates to changed step executions', async () => {
      underTest.upsertStep({
        id: 'fake-uuid-1',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush();

      underTest.upsertStep({
        id: 'fake-uuid-1',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);

      await underTest.flush();

      expect(executionStateRepository.bulkUpsert).toHaveBeenLastCalledWith([
        expect.objectContaining({
          id: 'fake-uuid-1',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.COMPLETED,
          finishedAt: '2025-08-05T20:01:00.000Z',
          executionTimeMs: 60000,
        }),
      ]);
    });

    it('should not flush if there are no changes', async () => {
      await underTest.flush();

      expect(executionStateRepository.bulkUpsert).not.toHaveBeenCalled();
    });

    it('should not flush if there are no changes since last flush', async () => {
      const fakeUuid = 'fake-uuid-1';
      underTest.updateWorkflowExecution({
        status: ExecutionStatus.SKIPPED,
      });
      underTest.upsertStep({
        id: fakeUuid,
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush();

      underTest.upsertStep({
        id: fakeUuid,
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);
      const secondFakeUuid = 'fake-uuid-2';
      underTest.upsertStep({
        id: secondFakeUuid,
        stepId: 'test-step-execution-id-created-again',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush();
      await underTest.flush();
      await underTest.flush();

      expect(executionStateRepository.bulkUpsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStepExecutionsByStepId', () => {
    it('should return all step executions for the provided step id', () => {
      underTest.upsertStep({
        id: 'mock-uuid-1',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: 'mock-uuid-2',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: 'mock-uuid-3',
        stepId: 'notNeededStep',
      });
      expect(underTest.getStepExecutionsByStepId('testStep')).toEqual([
        expect.objectContaining({
          id: 'mock-uuid-1',
          stepId: 'testStep',
        }),
        expect.objectContaining({
          id: 'mock-uuid-2',
          stepId: 'testStep',
        }),
      ]);
    });
  });

  describe('getLatestStepExecution', () => {
    it('should return latest step execution for the provided step id', () => {
      underTest.upsertStep({
        id: 'mock-uuid-1',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: 'mock-uuid-2',
        stepId: 'testStep',
      });
      expect(underTest.getLatestStepExecution('testStep')).toEqual(
        expect.objectContaining({
          id: 'mock-uuid-2',
          stepId: 'testStep',
        })
      );
    });
  });

  describe('load', () => {
    it('should load existing step executions from execution state', async () => {
      const fakeWorkflowExecution = {
        id: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
        stepExecutionIds: ['11', '22'],
      } as EsWorkflowExecution;
      underTest = new WorkflowExecutionState(fakeWorkflowExecution, executionStateRepository);

      executionStateRepository.getStepExecutions.mockResolvedValue({
        '11': {
          id: '11',
          stepId: 'testStep',
          status: ExecutionStatus.RUNNING,
        } as any,
        '22': {
          id: '22',
          stepId: 'testStep2',
          status: ExecutionStatus.COMPLETED,
        } as any,
      });

      await underTest.load();

      expect(underTest.getLatestStepExecution('testStep')).toEqual({
        id: '11',
        stepId: 'testStep',
        status: ExecutionStatus.RUNNING,
      });
      expect(underTest.getLatestStepExecution('testStep2')).toEqual({
        id: '22',
        stepId: 'testStep2',
        status: ExecutionStatus.COMPLETED,
      });
    });

    it('should sort step executions by executionIndex when loaded from repository', async () => {
      const fakeWorkflowExecution = {
        id: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
        stepExecutionIds: ['11', '44', '33', '22'],
      } as EsWorkflowExecution;
      underTest = new WorkflowExecutionState(fakeWorkflowExecution, executionStateRepository);

      executionStateRepository.getStepExecutions.mockResolvedValue({
        '11': { id: '11', stepId: 'testStep', stepExecutionIndex: 1 } as any,
        '44': { id: '44', stepId: 'testStep', stepExecutionIndex: 4 } as any,
        '33': { id: '33', stepId: 'testStep', stepExecutionIndex: 3 } as any,
        '22': { id: '22', stepId: 'testStep', stepExecutionIndex: 2 } as any,
      });

      await underTest.load();

      expect(
        underTest.getStepExecutionsByStepId('testStep')?.map((stepExecution) => stepExecution.id)
      ).toEqual(['11', '22', '33', '44']);
    });
  });
});
