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
import { WorkflowExecutionState } from '../workflow_execution_state';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';

describe('WorkflowExecutionState', () => {
  let underTest: WorkflowExecutionState;

  let workflowExecutionRepository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;

  beforeEach(() => {
    workflowExecutionRepository = {} as unknown as WorkflowExecutionRepository;
    workflowExecutionRepository.updateWorkflowExecution = jest.fn();

    stepExecutionRepository = {} as unknown as StepExecutionRepository;
    stepExecutionRepository.createStepExecution = jest.fn();
    stepExecutionRepository.updateStepExecution = jest.fn();
    stepExecutionRepository.updateStepExecutions = jest.fn();
    stepExecutionRepository.searchStepExecutionsByExecutionId = jest.fn();

    const fakeWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;
    underTest = new WorkflowExecutionState(
      fakeWorkflowExecution,
      workflowExecutionRepository,
      stepExecutionRepository
    );
  });

  it('should initialize with the provided workflow execution', () => {
    const workflowExecution = underTest.getWorkflowExecution();
    expect(workflowExecution).toEqual({
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
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

  it('should not call updateWorkflowExecution', () => {
    const updatedWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    underTest.updateWorkflowExecution(updatedWorkflowExecution);
    expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('should create step execution with assigning id, workflowRunId, workflowId only in local state', () => {
    const stepExecution = {
      id: 'test-workflow-execution-id-test-step-execution-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution;

    underTest.upsertStep(stepExecution);
    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual({
      id: 'test-workflow-execution-id-test-step-execution-id',
      workflowRunId: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
      executionIndex: 0,
    } as EsWorkflowStepExecution);
    expect(stepExecutionRepository.createStepExecution).not.toHaveBeenCalled();
  });

  it('should create step execution with executionIndex', () => {
    underTest.upsertStep({
      id: '11',
      stepId: 'test-step-execution-id',
    });
    underTest.upsertStep({
      id: '22',
      stepId: 'test-step-execution-id',
    });
    underTest.upsertStep({
      id: '33',
      stepId: 'test-step-execution-id',
    });

    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual(
      expect.objectContaining({
        id: '33',
        executionIndex: 2,
      } as EsWorkflowStepExecution)
    );
    expect(stepExecutionRepository.createStepExecution).not.toHaveBeenCalled();
  });

  it('should update step execution only in local state', () => {
    // create initial step execution
    underTest.upsertStep({
      id: 'test-workflow-execution-id-test-step-execution-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution);

    // update step execution
    underTest.upsertStep({
      id: 'test-workflow-execution-id-test-step-execution-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.COMPLETED,
      completedAt: '2025-08-05T20:01:00.000Z',
      executionTimeMs: 60000,
    } as EsWorkflowStepExecution);

    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual(
      expect.objectContaining({
        status: ExecutionStatus.COMPLETED,
        completedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      })
    );
    expect(stepExecutionRepository.updateStepExecution).not.toHaveBeenCalled();
    expect(stepExecutionRepository.updateStepExecutions).not.toHaveBeenCalled();
  });

  describe('flush', () => {
    it('should flush workflow execution changes', async () => {
      const updatedWorkflowExecution = {
        id: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2025-08-05T20:00:00.000Z',
        finishedAt: '2025-08-05T20:01:00.000Z',
      } as EsWorkflowExecution;

      underTest.updateWorkflowExecution(updatedWorkflowExecution);

      await underTest.flush();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        updatedWorkflowExecution
      );
    });

    it('should flush new step executions', async () => {
      const stepExecution = {
        id: 'test-workflow-execution-id-test-step-execution-id',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution;

      underTest.upsertStep(stepExecution);

      await underTest.flush();

      expect(stepExecutionRepository.createStepExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id-test-step-execution-id',
          workflowRunId: 'test-workflow-execution-id',
          workflowId: 'test-workflow-id',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-08-05T20:00:00.000Z',
        })
      );
    });

    it('should flush updates to changed step executions', async () => {
      // create initial step execution
      underTest.upsertStep({
        id: 'test-workflow-execution-id-test-step-execution-id',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush(); // initial flush to create the step execution

      // update step execution
      underTest.upsertStep({
        id: 'test-workflow-execution-id-test-step-execution-id',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        completedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);

      await underTest.flush();

      expect(stepExecutionRepository.updateStepExecutions).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-workflow-execution-id-test-step-execution-id',
          workflowRunId: 'test-workflow-execution-id',
          workflowId: 'test-workflow-id',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.COMPLETED,
          completedAt: '2025-08-05T20:01:00.000Z',
          executionTimeMs: 60000,
        }),
      ]);
    });

    it('should be able to create step executions that changed multiple times', async () => {
      // create initial step execution
      underTest.upsertStep({
        id: 'test-workflow-execution-id-test-step-execution-id',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);

      // update step execution
      underTest.upsertStep({
        id: 'test-workflow-execution-id-test-step-execution-id',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        completedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);

      await underTest.flush();

      expect(stepExecutionRepository.createStepExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id-test-step-execution-id',
          workflowRunId: 'test-workflow-execution-id',
          workflowId: 'test-workflow-id',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.COMPLETED,
          completedAt: '2025-08-05T20:01:00.000Z',
          executionTimeMs: 60000,
        })
      );
    });

    it('should not flush if there are no changes', async () => {
      await underTest.flush();

      expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(stepExecutionRepository.createStepExecution).not.toHaveBeenCalled();
      expect(stepExecutionRepository.updateStepExecutions).not.toHaveBeenCalled();
    });

    it('should not flush if there are no changes since last flush', async () => {
      // create initial step execution
      underTest.updateWorkflowExecution({
        status: ExecutionStatus.SKIPPED,
      });
      underTest.upsertStep({
        id: '11',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush(); // initial flush to create the step execution

      // update step execution
      underTest.upsertStep({
        id: '11',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        completedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: '22',
        stepId: 'test-step-execution-id-created-again',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush(); // first flush that flushes everything
      await underTest.flush(); // second flush with no changes
      await underTest.flush(); // third flush with no changes

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(stepExecutionRepository.createStepExecution).toHaveBeenCalledTimes(2); // create the first step execution and the second one
      expect(stepExecutionRepository.updateStepExecutions).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStepExecutionsByStepId', () => {
    it('should return all step executions for the provided step id', () => {
      underTest.upsertStep({
        id: '11',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: '22',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: '33',
        stepId: 'notNeededStep',
      });
      expect(underTest.getStepExecutionsByStepId('testStep')).toEqual([
        expect.objectContaining({
          id: '11',
          stepId: 'testStep',
        }),
        expect.objectContaining({
          id: '22',
          stepId: 'testStep',
        }),
      ]);
    });
  });

  describe('getLatestStepExecution', () => {
    it('should return all step executions for the provided step id', () => {
      underTest.upsertStep({
        id: '11',
        stepId: 'testStep',
      });
      underTest.upsertStep({
        id: '22',
        stepId: 'testStep',
      });
      expect(underTest.getLatestStepExecution('testStep')).toEqual(
        expect.objectContaining({
          id: '22',
          stepId: 'testStep',
        })
      );
    });
  });

  describe('load', () => {
    it('should load existing step executions', async () => {
      (stepExecutionRepository.searchStepExecutionsByExecutionId as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'testStep',
          status: ExecutionStatus.RUNNING,
        } as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'testStep2',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(underTest.getLatestStepExecution('testStep')).toEqual({
        id: '11',
        stepId: 'testStep',
        status: ExecutionStatus.RUNNING,
      } as EsWorkflowStepExecution);
      expect(underTest.getLatestStepExecution('testStep2')).toEqual({
        id: '22',
        stepId: 'testStep2',
        status: ExecutionStatus.COMPLETED,
      } as EsWorkflowStepExecution);
    });

    it('should sort step executions by executionIndex when loaded from repository', async () => {
      (stepExecutionRepository.searchStepExecutionsByExecutionId as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'testStep',
          executionIndex: 1,
        } as EsWorkflowStepExecution,
        {
          id: '44',
          stepId: 'testStep',
          executionIndex: 4,
        } as EsWorkflowStepExecution,
        {
          id: '33',
          stepId: 'testStep',
          executionIndex: 3,
        } as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'testStep',
          executionIndex: 2,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(
        underTest.getStepExecutionsByStepId('testStep')?.map((stepExecution) => stepExecution.id)
      ).toEqual(['11', '22', '33', '44']);
    });
  });
});
