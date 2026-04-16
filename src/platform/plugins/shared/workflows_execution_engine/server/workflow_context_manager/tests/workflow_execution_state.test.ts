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
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { WorkflowExecutionState } from '../workflow_execution_state';

describe('WorkflowExecutionState', () => {
  let underTest: WorkflowExecutionState;

  let workflowExecutionRepository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;

  beforeEach(() => {
    workflowExecutionRepository = {} as unknown as WorkflowExecutionRepository;
    workflowExecutionRepository.updateWorkflowExecution = jest.fn();

    stepExecutionRepository = {} as unknown as StepExecutionRepository;
    stepExecutionRepository.bulkUpsert = jest.fn();
    stepExecutionRepository.getStepExecutionsByIds = jest.fn();

    const fakeWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
      isTestRun: false,
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
      isTestRun: false,
    } as EsWorkflowExecution);
  });

  it('should update workflow execution', () => {
    const updatedWorkflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2025-08-05T20:00:00.000Z',
      isTestRun: false,
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
    // Reset mock and set a specific uuid for this test

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
      isTestRun: false,
    } as EsWorkflowStepExecution);
    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should set isTestRun on step execution from workflow execution', () => {
    const workflowExecutionWithTestRun = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
      isTestRun: true,
    } as EsWorkflowExecution;
    const stateWithTestRun = new WorkflowExecutionState(
      workflowExecutionWithTestRun,
      workflowExecutionRepository,
      stepExecutionRepository
    );

    stateWithTestRun.upsertStep({
      id: 'fake-id',
      stepId: 'test-step',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution);

    expect(stateWithTestRun.getLatestStepExecution('test-step')).toEqual(
      expect.objectContaining({
        id: 'fake-id',
        workflowRunId: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        isTestRun: true,
      })
    );
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
    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
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
    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should update step execution only in local state', () => {
    // create initial step execution
    underTest.upsertStep({
      id: 'fake-id',
      stepId: 'test-step-execution-id',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution);

    // update step execution
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
    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  describe('flush', () => {
    beforeEach(() => {
      workflowExecutionRepository.getWorkflowExecutionById = jest
        .fn()
        .mockResolvedValue({} as EsWorkflowExecution);
    });

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

    it('should flush workflow execution changes with execution id even if execution id is not in change', async () => {
      const updatedWorkflowExecution = {} as EsWorkflowExecution;

      underTest.updateWorkflowExecution(updatedWorkflowExecution);

      await underTest.flush();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id',
        })
      );
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

      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'fake-uuid',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-08-05T20:00:00.000Z',
          isTestRun: false,
        } as EsWorkflowStepExecution),
      ]);
    });

    it('should flush updates to changed step executions', async () => {
      // create initial step execution
      underTest.upsertStep({
        id: 'fake-uuid-1',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);
      await underTest.flush(); // initial flush to create the step execution

      // update step execution
      underTest.upsertStep({
        id: 'fake-uuid-1',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);

      await underTest.flush();

      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
        {
          id: 'fake-uuid-1',
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.COMPLETED,
          finishedAt: '2025-08-05T20:01:00.000Z',
          executionTimeMs: 60000,
        } as EsWorkflowStepExecution,
      ]);
    });

    it('should be able to create step executions that changed multiple times by merging changes', async () => {
      // create initial step execution
      const fakeUuid = 'fake-uuid-1';
      underTest.upsertStep({
        id: fakeUuid,
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
      } as EsWorkflowStepExecution);

      // update step execution
      underTest.upsertStep({
        id: fakeUuid,
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 2000,
      } as EsWorkflowStepExecution);

      await underTest.flush();

      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: fakeUuid,
          stepId: 'test-step-execution-id',
          status: ExecutionStatus.COMPLETED,
          finishedAt: '2025-08-05T20:01:00.000Z',
          startedAt: '2025-08-05T20:00:00.000Z',
          executionTimeMs: 2000,
          isTestRun: false,
        } as EsWorkflowStepExecution),
      ]);
    });

    it('should not flush if there are no changes', async () => {
      await underTest.flush();

      expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    });

    it('should not flush if there are no changes since last flush', async () => {
      // create initial step execution
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
      await underTest.flush(); // initial flush to create the step execution

      // update step execution
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
      await underTest.flush(); // first flush that flushes everything
      await underTest.flush(); // second flush with no changes
      await underTest.flush(); // third flush with no changes

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledTimes(2);
      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledTimes(2);
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
    it('should throw if stepExecutionIds is not set on the workflow execution', async () => {
      await expect(underTest.load()).rejects.toThrow(
        'WorkflowExecutionState: Workflow execution must have step execution IDs to be loaded'
      );
    });

    it('should load existing step executions with output excluded', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '22'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'testStep',
          stepType: 'connector',
          status: ExecutionStatus.RUNNING,
        } as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'testStep2',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['11', '22'],
        undefined,
        ['output']
      );
      expect(underTest.getLatestStepExecution('testStep')).toEqual(
        expect.objectContaining({
          id: '11',
          stepId: 'testStep',
          status: ExecutionStatus.RUNNING,
        })
      );
      expect(underTest.getLatestStepExecution('testStep2')).toEqual(
        expect.objectContaining({
          id: '22',
          stepId: 'testStep2',
          status: ExecutionStatus.COMPLETED,
        })
      );
    });

    it('should mark non-data.set step outputs as deferred after load', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '22'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'connectorStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'ifStep',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(underTest.hasEvictedOutputs()).toBe(true);
    });

    it('should eagerly load data.set step outputs via secondary fetch', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '22'] });
      const dataSetOutput = { myVar: 'hello' };
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock)
        // First call: load without outputs
        .mockResolvedValueOnce([
          {
            id: '11',
            stepId: 'connectorStep',
            stepType: 'connector',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
          {
            id: '22',
            stepId: 'dataSetStep',
            stepType: 'data.set',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ])
        // Second call: eager data.set output fetch
        .mockResolvedValueOnce([
          {
            id: '22',
            output: dataSetOutput,
          } as unknown as EsWorkflowStepExecution,
        ]);
      await underTest.load();

      // data.set output should be eagerly loaded
      expect(underTest.getStepExecution('22')?.output).toEqual(dataSetOutput);
      // data.set should NOT be in evicted set
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['22'],
        ['id', 'output']
      );
      // connector step should be deferred (evicted)
      expect(underTest.hasEvictedOutputs()).toBe(true);
    });

    it('should allow rehydrateOutputs to restore deferred outputs from load', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11'] });
      const restoredOutput = { result: 'restored' };
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock)
        // First call: load without outputs
        .mockResolvedValueOnce([
          {
            id: '11',
            stepId: 'connectorStep',
            stepType: 'connector',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ]);
      await underTest.load();

      expect(underTest.hasEvictedOutputs()).toBe(true);

      // Rehydrate
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValueOnce([
        {
          id: '11',
          output: restoredOutput,
        } as unknown as EsWorkflowStepExecution,
      ]);
      await underTest.rehydrateOutputs(['11']);

      expect(underTest.getStepExecution('11')?.output).toEqual(restoredOutput);
      expect(underTest.hasEvictedOutputs()).toBe(false);
    });

    it('should not mark any outputs as evicted when all steps are data.set', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '22'] });
      const dataSetOutput1 = { var1: 'a' };
      const dataSetOutput2 = { var2: 'b' };
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: '11',
            stepId: 'setVar1',
            stepType: 'data.set',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
          {
            id: '22',
            stepId: 'setVar2',
            stepType: 'data.set',
            status: ExecutionStatus.COMPLETED,
          } as EsWorkflowStepExecution,
        ])
        .mockResolvedValueOnce([
          { id: '11', output: dataSetOutput1 } as unknown as EsWorkflowStepExecution,
          { id: '22', output: dataSetOutput2 } as unknown as EsWorkflowStepExecution,
        ]);
      await underTest.load();

      expect(underTest.hasEvictedOutputs()).toBe(false);
      expect(underTest.getStepExecution('11')?.output).toEqual(dataSetOutput1);
      expect(underTest.getStepExecution('22')?.output).toEqual(dataSetOutput2);
    });

    it('should treat steps with undefined stepType as non-data.set (mark evicted)', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValueOnce([
        {
          id: '11',
          stepId: 'legacyStep',
          // stepType intentionally omitted
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(underTest.hasEvictedOutputs()).toBe(true);
    });

    it('should sort step executions by executionIndex when loaded from repository', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '44', '33', '22'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'testStep',
          stepExecutionIndex: 1,
        } as EsWorkflowStepExecution,
        {
          id: '44',
          stepId: 'testStep',
          stepExecutionIndex: 4,
        } as EsWorkflowStepExecution,
        {
          id: '33',
          stepId: 'testStep',
          stepExecutionIndex: 3,
        } as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'testStep',
          stepExecutionIndex: 2,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(
        underTest.getStepExecutionsByStepId('testStep')?.map((stepExecution) => stepExecution.id)
      ).toEqual(['11', '22', '33', '44']);
    });
  });

  describe('output eviction', () => {
    const EVICTION_THRESHOLD = 100; // 100 bytes

    let evictableState: WorkflowExecutionState;

    beforeEach(() => {
      evictableState = new WorkflowExecutionState(
        {
          id: 'test-workflow-execution-id',
          workflowId: 'test-workflow-id',
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-08-05T20:00:00.000Z',
          isTestRun: false,
        } as EsWorkflowExecution,
        workflowExecutionRepository,
        stepExecutionRepository,
        EVICTION_THRESHOLD
      );
    });

    function createCompletedStep(
      id: string,
      stepId: string,
      output: unknown,
      stepType?: string
    ): void {
      evictableState.upsertStep({
        id,
        stepId,
        stepType,
        status: ExecutionStatus.COMPLETED,
        output,
      } as Partial<EsWorkflowStepExecution>);
    }

    describe('evictCompletedStepOutputs', () => {
      it('should evict output above threshold from completed step', () => {
        createCompletedStep('step-1', 'myStep', { largeData: 'x'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });

      it('should evict output exactly at threshold (minPayloadSize is inclusive)', () => {
        createCompletedStep('step-1', 'myStep', { data: 'at-boundary' }, 'connector');
        evictableState.recordOutputSize('step-1', EVICTION_THRESHOLD); // exactly 100

        evictableState.evictCompletedStepOutputs(['step-1']);

        // recordedSize (100) is NOT < evictionMinBytes (100), so the step IS evicted
        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });

      it('should retain output below threshold', () => {
        const smallOutput = { key: 'val' };
        createCompletedStep('step-1', 'myStep', smallOutput, 'connector');
        evictableState.recordOutputSize('step-1', 10);

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toEqual(smallOutput);
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should retain output from running steps', () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.RUNNING,
          output: { data: 'x'.repeat(200) },
        } as Partial<EsWorkflowStepExecution>);
        evictableState.recordOutputSize('step-1', 250);

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should retain output from data.set steps regardless of size', () => {
        createCompletedStep('step-1', 'myDataSet', { largeData: 'x'.repeat(200) }, 'data.set');
        evictableState.recordOutputSize('step-1', 250);

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should not add to stepDocumentsChanges when evicting', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        // Flush first to clear pending changes
        await evictableState.flush();
        jest.clearAllMocks();

        // Now evict
        evictableState.evictCompletedStepOutputs(['step-1']);

        // Flush again — should not send anything since eviction is memory-only
        await evictableState.flush();
        expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
      });

      it('should skip steps with no recorded size (assumes small)', () => {
        createCompletedStep('step-1', 'myStep', { data: 'something' }, 'connector');
        // No recordOutputSize call

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should evict output from failed steps above threshold', () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.FAILED,
          output: null,
        } as Partial<EsWorkflowStepExecution>);
        evictableState.recordOutputSize('step-1', 250);

        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });
    });

    describe('hasEvictedOutputs', () => {
      it('should return false when nothing is evicted', () => {
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should return true after eviction', () => {
        createCompletedStep('step-1', 'myStep', { data: 'large' }, 'connector');
        evictableState.recordOutputSize('step-1', 250);
        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });
    });

    describe('rehydrateOutputs', () => {
      it('should call repository and restore output', async () => {
        const originalOutput = { restored: true, data: 'x'.repeat(200) };
        createCompletedStep('step-1', 'myStep', originalOutput, 'connector');
        evictableState.recordOutputSize('step-1', 250);
        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();

        (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
          {
            id: 'step-1',
            stepId: 'myStep',
            output: originalOutput,
          } as unknown as EsWorkflowStepExecution,
        ]);

        await evictableState.rehydrateOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toEqual(originalOutput);
        expect(evictableState.hasEvictedOutputs()).toBe(false);
        expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
          ['step-1'],
          ['id', 'output']
        );
      });

      it('should be a no-op when no requested IDs are evicted', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'small' }, 'connector');
        // Not evicted

        await evictableState.rehydrateOutputs(['step-1']);

        expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
      });

      it('should handle missing documents from ES gracefully', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'large' }, 'connector');
        evictableState.recordOutputSize('step-1', 250);
        evictableState.evictCompletedStepOutputs(['step-1']);

        (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([]);

        await evictableState.rehydrateOutputs(['step-1']);

        // Should not throw, and should clear the eviction entry
        expect(evictableState.hasEvictedOutputs()).toBe(false);
        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
      });

      it('should restore output after full eviction + rehydration round-trip', async () => {
        const output = { restored: true };
        createCompletedStep('step-1', 'myStep', output, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        // Flush to persist, then evict
        await evictableState.flush();
        evictableState.evictCompletedStepOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();

        (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
          { id: 'step-1', stepId: 'myStep', output } as unknown as EsWorkflowStepExecution,
        ]);

        await evictableState.rehydrateOutputs(['step-1']);

        expect(evictableState.getStepExecution('step-1')?.output).toEqual(output);
      });
    });

    describe('deferred output eviction via flushStepChanges', () => {
      it('should NOT evict output on the flush that persists it', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        await evictableState.flushStepChanges();

        // Output should still be in memory after the first flush
        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should evict output on the second flush', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        await evictableState.flushStepChanges(); // persists + queues for eviction
        await evictableState.flushStepChanges(); // drains pending eviction

        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });

      it('should not evict small outputs even after two flushes', async () => {
        const smallOutput = { key: 'val' };
        createCompletedStep('step-1', 'myStep', smallOutput, 'connector');
        evictableState.recordOutputSize('step-1', 10);

        await evictableState.flushStepChanges();
        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.output).toEqual(smallOutput);
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });

      it('should handle multiple steps completing between flushes', async () => {
        createCompletedStep('step-1', 's1', { data: 'x'.repeat(200) }, 'connector');
        createCompletedStep('step-2', 's2', { data: 'y'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);
        evictableState.recordOutputSize('step-2', 300);

        await evictableState.flushStepChanges(); // persists both, queues both
        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.getStepExecution('step-2')?.output).toBeDefined();

        await evictableState.flushStepChanges(); // drains both
        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.getStepExecution('step-2')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });

      it('should evict previous batch and queue new batch on successive flushes', async () => {
        // Step A completes in cycle 1
        createCompletedStep('step-a', 'sA', { data: 'a'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-a', 250);
        await evictableState.flushStepChanges(); // persists A, queues A

        // Step B completes in cycle 2
        createCompletedStep('step-b', 'sB', { data: 'b'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-b', 300);
        await evictableState.flushStepChanges(); // evicts A, persists B, queues B

        expect(evictableState.getStepExecution('step-a')?.output).toBeUndefined();
        expect(evictableState.getStepExecution('step-b')?.output).toBeDefined();

        // Cycle 3: drain B
        await evictableState.flushStepChanges();
        expect(evictableState.getStepExecution('step-b')?.output).toBeUndefined();
      });

      it('should process pending eviction on empty flush (no new changes)', async () => {
        createCompletedStep('step-1', 'myStep', { data: 'x'.repeat(200) }, 'connector');
        evictableState.recordOutputSize('step-1', 250);

        await evictableState.flushStepChanges(); // persists + queues
        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();

        // No new upserts — but empty flush should still drain pending
        await evictableState.flushStepChanges();
        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });

      it('should not evict data.set outputs even after deferral', async () => {
        createCompletedStep('step-1', 'myDataSet', { largeData: 'x'.repeat(200) }, 'data.set');
        evictableState.recordOutputSize('step-1', 250);

        await evictableState.flushStepChanges();
        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();
        expect(evictableState.hasEvictedOutputs()).toBe(false);
      });
    });

    describe('input eviction', () => {
      it('should evict input from completed step after flush', async () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
          input: { message: 'hello' },
          output: { result: 'ok' },
        } as Partial<EsWorkflowStepExecution>);

        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.input).toBeUndefined();
      });

      it('should evict input from failed step after flush', async () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.FAILED,
          input: { message: 'hello' },
          output: null,
        } as Partial<EsWorkflowStepExecution>);

        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.input).toBeUndefined();
      });

      it('should NOT evict input from running step after flush', async () => {
        const input = { foreach: '{{steps.data.output}}' };
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'loopStep',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          input,
        } as Partial<EsWorkflowStepExecution>);

        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.input).toEqual(input);
      });

      it('should NOT evict input from waiting step after flush', async () => {
        const input = { duration: '20m' };
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'waitStep',
          stepType: 'wait',
          status: ExecutionStatus.WAITING,
          input,
        } as Partial<EsWorkflowStepExecution>);

        await evictableState.flushStepChanges();

        expect(evictableState.getStepExecution('step-1')?.input).toEqual(input);
      });

      it('should not cause stepDocumentsChanges on subsequent flush after input eviction', async () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
          input: { message: 'hello' },
        } as Partial<EsWorkflowStepExecution>);

        await evictableState.flushStepChanges(); // persists + evicts input
        jest.clearAllMocks();

        await evictableState.flushStepChanges(); // should be a no-op for persistence
        expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
      });

      it('should evict input immediately and output on the next flush', async () => {
        evictableState.upsertStep({
          id: 'step-1',
          stepId: 'myStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
          input: { message: 'hello' },
          output: { data: 'x'.repeat(200) },
        } as Partial<EsWorkflowStepExecution>);
        evictableState.recordOutputSize('step-1', 250);

        await evictableState.flushStepChanges(); // flush 1: input evicted, output queued
        expect(evictableState.getStepExecution('step-1')?.input).toBeUndefined();
        expect(evictableState.getStepExecution('step-1')?.output).toBeDefined();

        await evictableState.flushStepChanges(); // flush 2: output evicted
        expect(evictableState.getStepExecution('step-1')?.output).toBeUndefined();
        expect(evictableState.hasEvictedOutputs()).toBe(true);
      });
    });

    describe('recordOutputSize', () => {
      it('should store size correctly for later threshold check', () => {
        createCompletedStep('step-1', 'myStep', { data: 'something' }, 'connector');
        evictableState.recordOutputSize('step-1', 50);

        // Below threshold — should not evict
        evictableState.evictCompletedStepOutputs(['step-1']);
        expect(evictableState.hasEvictedOutputs()).toBe(false);

        // Record a larger size for a different step
        createCompletedStep('step-2', 'myStep2', { data: 'large' }, 'connector');
        evictableState.recordOutputSize('step-2', 200);

        evictableState.evictCompletedStepOutputs(['step-1', 'step-2']);
        expect(evictableState.hasEvictedOutputs()).toBe(true);
        expect(evictableState.getStepExecution('step-2')?.output).toBeUndefined();
      });
    });

    describe('getOutputSizeStats', () => {
      it('should return zeros when no sizes recorded', () => {
        expect(evictableState.getOutputSizeStats()).toEqual({
          totalBytes: 0,
          stepCount: 0,
        });
      });

      it('should sum sizes from non-evicted steps', () => {
        createCompletedStep('step-1', 's1', { data: 'a' }, 'connector');
        createCompletedStep('step-2', 's2', { data: 'b' }, 'connector');
        evictableState.recordOutputSize('step-1', 100);
        evictableState.recordOutputSize('step-2', 200);

        expect(evictableState.getOutputSizeStats()).toEqual({
          totalBytes: 300,
          stepCount: 2,
        });
      });

      it('should combine sizes from both active and evicted steps', () => {
        createCompletedStep('step-1', 's1', { data: 'a' }, 'connector');
        createCompletedStep('step-2', 's2', { data: 'b' }, 'connector');
        evictableState.recordOutputSize('step-1', 150);
        evictableState.recordOutputSize('step-2', 250);

        // Evict step-2 (above threshold)
        evictableState.evictCompletedStepOutputs(['step-2']);

        // step-1 size is in outputSizes, step-2 size is in evictedOutputIdsAndBytes
        const stats = evictableState.getOutputSizeStats();
        expect(stats.totalBytes).toBe(400);
        expect(stats.stepCount).toBe(2);
      });
    });
  });
  describe('evictStaleLoopOutputs', () => {
    it('should nullify output and input on non-latest executions for given stepIds', () => {
      underTest.upsertStep({
        id: 'exec-1',
        stepId: 'innerStep',
        output: { data: 'iteration-0' },
        input: { idx: 0 },
      });
      underTest.upsertStep({
        id: 'exec-2',
        stepId: 'innerStep',
        output: { data: 'iteration-1' },
        input: { idx: 1 },
      });
      underTest.upsertStep({
        id: 'exec-3',
        stepId: 'innerStep',
        output: { data: 'iteration-2' },
        input: { idx: 2 },
      });

      underTest.evictStaleLoopOutputs(['innerStep']);

      const executions = underTest.getStepExecutionsByStepId('innerStep');
      expect(executions[0].output).toBeUndefined();
      expect(executions[0].input).toBeUndefined();
      expect(executions[1].output).toBeUndefined();
      expect(executions[1].input).toBeUndefined();
      // Latest execution preserved
      expect(executions[2].output).toEqual({ data: 'iteration-2' });
      expect(executions[2].input).toEqual({ idx: 2 });
    });

    it('should preserve all data.set step outputs', () => {
      underTest.upsertStep({
        id: 'ds-1',
        stepId: 'setVar',
        stepType: 'data.set',
        output: { myVar: 'val-0' },
        input: { myVar: 'val-0' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'ds-2',
        stepId: 'setVar',
        stepType: 'data.set',
        output: { myVar: 'val-1' },
        input: { myVar: 'val-1' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'ds-3',
        stepId: 'setVar',
        stepType: 'data.set',
        output: { myVar: 'val-2' },
        input: { myVar: 'val-2' },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(['setVar']);

      const executions = underTest.getStepExecutionsByStepId('setVar');
      expect(executions[0].output).toEqual({ myVar: 'val-0' });
      expect(executions[1].output).toEqual({ myVar: 'val-1' });
      expect(executions[2].output).toEqual({ myVar: 'val-2' });
    });

    it('should preserve metadata fields on evicted executions', () => {
      underTest.upsertStep({
        id: 'exec-1',
        stepId: 'innerStep',
        stepType: 'atomic',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2025-01-01T00:00:00.000Z',
        finishedAt: '2025-01-01T00:01:00.000Z',
        executionTimeMs: 60000,
        output: { large: 'payload' },
        input: { some: 'input' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'exec-2',
        stepId: 'innerStep',
        output: { latest: true },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(['innerStep']);

      const evicted = underTest.getStepExecution('exec-1');
      expect(evicted).toEqual(
        expect.objectContaining({
          id: 'exec-1',
          stepId: 'innerStep',
          stepType: 'atomic',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-01-01T00:00:00.000Z',
          finishedAt: '2025-01-01T00:01:00.000Z',
          executionTimeMs: 60000,
          output: undefined,
          input: undefined,
        })
      );
    });

    it('should not touch steps with only one execution', () => {
      underTest.upsertStep({
        id: 'only-exec',
        stepId: 'singleStep',
        output: { preserved: true },
        input: { kept: true },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(['singleStep']);

      const execution = underTest.getStepExecution('only-exec');
      expect(execution?.output).toEqual({ preserved: true });
      expect(execution?.input).toEqual({ kept: true });
    });

    it('should not touch steps not in the provided list', () => {
      underTest.upsertStep({
        id: 'outer-1',
        stepId: 'outerStep',
        output: { data: 'untouched-0' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'outer-2',
        stepId: 'outerStep',
        output: { data: 'untouched-1' },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(['otherStep']);

      const executions = underTest.getStepExecutionsByStepId('outerStep');
      expect(executions[0].output).toEqual({ data: 'untouched-0' });
      expect(executions[1].output).toEqual({ data: 'untouched-1' });
    });

    it('should handle empty innerStepIds', () => {
      underTest.upsertStep({
        id: 'exec-1',
        stepId: 'someStep',
        output: { data: true },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs([]);

      expect(underTest.getStepExecution('exec-1')?.output).toEqual({ data: true });
    });

    it('should handle stepIds with no executions in the index', () => {
      expect(() => underTest.evictStaleLoopOutputs(['nonexistent'])).not.toThrow();
    });

    it('should handle mixed data.set and non-data.set steps', () => {
      underTest.upsertStep({
        id: 'action-1',
        stepId: 'actionStep',
        stepType: 'atomic',
        output: { result: 'iter-0' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'action-2',
        stepId: 'actionStep',
        stepType: 'atomic',
        output: { result: 'iter-1' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'ds-1',
        stepId: 'dataStep',
        stepType: 'data.set',
        output: { var: 'val-0' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'ds-2',
        stepId: 'dataStep',
        stepType: 'data.set',
        output: { var: 'val-1' },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(['actionStep', 'dataStep']);

      // Non-latest atomic step output evicted
      expect(underTest.getStepExecution('action-1')?.output).toBeUndefined();
      // Latest atomic step output preserved
      expect(underTest.getStepExecution('action-2')?.output).toEqual({ result: 'iter-1' });
      // All data.set outputs preserved
      expect(underTest.getStepExecution('ds-1')?.output).toEqual({ var: 'val-0' });
      expect(underTest.getStepExecution('ds-2')?.output).toEqual({ var: 'val-1' });
    });

    it('should accept a Set as input', () => {
      underTest.upsertStep({
        id: 'exec-1',
        stepId: 'innerStep',
        output: { data: 'old' },
      } as unknown as EsWorkflowStepExecution);
      underTest.upsertStep({
        id: 'exec-2',
        stepId: 'innerStep',
        output: { data: 'latest' },
      } as unknown as EsWorkflowStepExecution);

      underTest.evictStaleLoopOutputs(new Set(['innerStep']));

      expect(underTest.getStepExecution('exec-1')?.output).toBeUndefined();
      expect(underTest.getStepExecution('exec-2')?.output).toEqual({ data: 'latest' });
    });

    describe('data.set preservation within loops', () => {
      it('should preserve data.set output for step A inside foreach step B', () => {
        // Simulate: foreach B iterates 3 times, each iteration runs data.set step A
        underTest.upsertStep({
          id: 'ds-a-iter0',
          stepId: 'stepA',
          stepType: 'data.set',
          output: { counter: 1 },
          input: { counter: 1 },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'ds-a-iter1',
          stepId: 'stepA',
          stepType: 'data.set',
          output: { counter: 2 },
          input: { counter: 2 },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'ds-a-iter2',
          stepId: 'stepA',
          stepType: 'data.set',
          output: { counter: 3 },
          input: { counter: 3 },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['stepA']);

        // ALL data.set outputs must survive — getVariables() reads every one
        const executions = underTest.getStepExecutionsByStepId('stepA');
        expect(executions).toHaveLength(3);
        expect(executions[0].output).toEqual({ counter: 1 });
        expect(executions[0].input).toEqual({ counter: 1 });
        expect(executions[1].output).toEqual({ counter: 2 });
        expect(executions[1].input).toEqual({ counter: 2 });
        expect(executions[2].output).toEqual({ counter: 3 });
        expect(executions[2].input).toEqual({ counter: 3 });
      });

      it('should preserve data.set but evict sibling non-data.set steps in the same loop', () => {
        // foreach loop body: [data.set step, connector step]
        for (let i = 0; i < 3; i++) {
          underTest.upsertStep({
            id: `ds-${i}`,
            stepId: 'setVarStep',
            stepType: 'data.set',
            output: { accumulator: `val-${i}` },
          } as unknown as EsWorkflowStepExecution);
          underTest.upsertStep({
            id: `conn-${i}`,
            stepId: 'connectorStep',
            stepType: 'slack',
            output: { message: `sent-${i}` },
          } as unknown as EsWorkflowStepExecution);
        }

        underTest.evictStaleLoopOutputs(['setVarStep', 'connectorStep']);

        // All data.set outputs preserved
        expect(underTest.getStepExecution('ds-0')?.output).toEqual({ accumulator: 'val-0' });
        expect(underTest.getStepExecution('ds-1')?.output).toEqual({ accumulator: 'val-1' });
        expect(underTest.getStepExecution('ds-2')?.output).toEqual({ accumulator: 'val-2' });

        // Non-latest connector outputs evicted, latest preserved
        expect(underTest.getStepExecution('conn-0')?.output).toBeUndefined();
        expect(underTest.getStepExecution('conn-1')?.output).toBeUndefined();
        expect(underTest.getStepExecution('conn-2')?.output).toEqual({ message: 'sent-2' });
      });
    });

    describe('nested loop eviction', () => {
      it('should handle inner loop eviction followed by outer loop eviction', () => {
        // Outer loop (2 iters) -> Inner loop (3 iters) -> action step
        // Outer iter 0: inner produces 3 executions of 'action'
        for (let i = 0; i < 3; i++) {
          underTest.upsertStep({
            id: `action-outer0-inner${i}`,
            stepId: 'action',
            stepType: 'atomic',
            output: { value: `0-${i}` },
          } as unknown as EsWorkflowStepExecution);
        }
        // Inner loop finishes -> evict inner body (action)
        underTest.evictStaleLoopOutputs(['action']);

        // After inner eviction: only latest (inner iter 2) has output
        expect(underTest.getStepExecution('action-outer0-inner0')?.output).toBeUndefined();
        expect(underTest.getStepExecution('action-outer0-inner1')?.output).toBeUndefined();
        expect(underTest.getStepExecution('action-outer0-inner2')?.output).toEqual({
          value: '0-2',
        });

        // Outer iter 1: inner produces 3 more executions
        for (let i = 0; i < 3; i++) {
          underTest.upsertStep({
            id: `action-outer1-inner${i}`,
            stepId: 'action',
            stepType: 'atomic',
            output: { value: `1-${i}` },
          } as unknown as EsWorkflowStepExecution);
        }
        // Inner loop finishes again -> evict inner body
        underTest.evictStaleLoopOutputs(['action']);

        // Now 6 total executions. After second inner eviction,
        // only the very latest (outer1-inner2) should have output
        const allActionExecs = underTest.getStepExecutionsByStepId('action');
        expect(allActionExecs).toHaveLength(6);
        const withOutput = allActionExecs.filter((e) => e.output !== undefined);
        expect(withOutput).toHaveLength(1);
        expect(withOutput[0].id).toBe('action-outer1-inner2');

        // Outer loop finishes -> evict outer body (includes action and inner loop steps)
        underTest.evictStaleLoopOutputs(['action', 'innerLoop']);

        // After outer eviction: still only the very latest has output
        const finalWithOutput = underTest
          .getStepExecutionsByStepId('action')
          .filter((e) => e.output !== undefined);
        expect(finalWithOutput).toHaveLength(1);
        expect(finalWithOutput[0].id).toBe('action-outer1-inner2');
      });
    });

    describe('idempotency', () => {
      it('should be safe to call eviction multiple times on the same step IDs', () => {
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'step',
          output: { data: 'old' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'step',
          output: { data: 'latest' },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['step']);
        underTest.evictStaleLoopOutputs(['step']);
        underTest.evictStaleLoopOutputs(['step']);

        expect(underTest.getStepExecution('exec-1')?.output).toBeUndefined();
        expect(underTest.getStepExecution('exec-2')?.output).toEqual({ data: 'latest' });
      });
    });

    describe('getLatestStepExecution correctness after eviction', () => {
      it('should return the latest execution with its output intact', () => {
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'step',
          output: { data: 'first' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'step',
          output: { data: 'second' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-3',
          stepId: 'step',
          output: { data: 'latest' },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['step']);

        const latest = underTest.getLatestStepExecution('step');
        expect(latest?.id).toBe('exec-3');
        expect(latest?.output).toEqual({ data: 'latest' });
      });
    });

    describe('getAllStepExecutions after eviction', () => {
      it('should still return all executions for telemetry', () => {
        for (let i = 0; i < 5; i++) {
          underTest.upsertStep({
            id: `exec-${i}`,
            stepId: 'loopBody',
            stepType: 'atomic',
            status: ExecutionStatus.COMPLETED,
            output: { iteration: i },
          } as unknown as EsWorkflowStepExecution);
        }

        underTest.evictStaleLoopOutputs(['loopBody']);

        const all = underTest.getAllStepExecutions();
        expect(all).toHaveLength(5);
        // All should still have metadata
        all.forEach((exec) => {
          expect(exec.stepId).toBe('loopBody');
          expect(exec.status).toBe(ExecutionStatus.COMPLETED);
        });
        // Only the last one should have output
        expect(all.filter((e) => e.output !== undefined)).toHaveLength(1);
      });
    });

    describe('state field preservation', () => {
      it('should preserve step state (used by loops and retries) after eviction', () => {
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'retryStep',
          stepType: 'atomic',
          state: { retryCount: 1, lastError: 'timeout' },
          output: { result: 'retry-1' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'retryStep',
          stepType: 'atomic',
          state: { retryCount: 2 },
          output: { result: 'retry-2' },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['retryStep']);

        const evicted = underTest.getStepExecution('exec-1');
        expect(evicted?.state).toEqual({ retryCount: 1, lastError: 'timeout' });
        expect(evicted?.output).toBeUndefined();
      });
    });

    describe('large iteration counts', () => {
      it('should handle eviction of many iterations efficiently', () => {
        const iterationCount = 1000;
        for (let i = 0; i < iterationCount; i++) {
          underTest.upsertStep({
            id: `exec-${i}`,
            stepId: 'heavyStep',
            stepType: 'atomic',
            output: { payload: 'x'.repeat(100) },
            input: { idx: i },
          } as unknown as EsWorkflowStepExecution);
        }

        underTest.evictStaleLoopOutputs(['heavyStep']);

        const executions = underTest.getStepExecutionsByStepId('heavyStep');
        expect(executions).toHaveLength(iterationCount);

        // Only the very last one should retain output
        const withOutput = executions.filter((e) => e.output !== undefined);
        expect(withOutput).toHaveLength(1);
        expect(withOutput[0].id).toBe(`exec-${iterationCount - 1}`);
      });
    });

    describe('does not affect pending flush', () => {
      it('should not add evicted changes to stepDocumentsChanges', async () => {
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'step',
          output: { data: 'old' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'step',
          output: { data: 'latest' },
        } as unknown as EsWorkflowStepExecution);

        // Flush the creates to ES
        await underTest.flush();
        (stepExecutionRepository.bulkUpsert as jest.Mock).mockClear();

        // Now evict — this should NOT trigger another flush of the evicted data
        underTest.evictStaleLoopOutputs(['step']);
        await underTest.flush();

        // No additional bulk upsert should have been triggered
        expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
      });

      it('should not corrupt a pending flush entry when eviction runs before flush', async () => {
        // createStep stores the same object ref in both stepExecutions and stepDocumentsChanges.
        // Eviction must NOT mutate the pending flush entry, otherwise the step will be
        // upserted to ES with output: undefined, contradicting the "in-memory only" contract.
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'innerStep',
          stepType: 'atomic',
          output: { result: 'iter-0' },
          input: { idx: 0 },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'innerStep',
          stepType: 'atomic',
          output: { result: 'iter-1' },
          input: { idx: 1 },
        } as unknown as EsWorkflowStepExecution);

        // Evict BEFORE flushing — the pending entry for exec-1 must still carry its output
        underTest.evictStaleLoopOutputs(['innerStep']);

        await underTest.flush();

        // exec-1 was pending. Its flush payload must still include the original output/input
        // because eviction is in-memory-only and must not touch pending ES writes.
        expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'exec-1',
              output: { result: 'iter-0' },
              input: { idx: 0 },
            }),
          ])
        );
      });
    });

    describe('error field preservation', () => {
      it('should preserve error field on evicted failed step executions', () => {
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'failingStep',
          stepType: 'atomic',
          status: ExecutionStatus.FAILED,
          error: { message: 'timeout', type: 'StepTimeout' },
          output: null,
          input: { request: 'data' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'failingStep',
          stepType: 'atomic',
          status: ExecutionStatus.COMPLETED,
          output: { result: 'success' },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['failingStep']);

        const evicted = underTest.getStepExecution('exec-1');
        expect(evicted?.error).toEqual({ message: 'timeout', type: 'StepTimeout' });
        expect(evicted?.status).toBe(ExecutionStatus.FAILED);
        expect(evicted?.input).toBeUndefined();
      });
    });

    describe('scopeStack preservation', () => {
      it('should preserve scopeStack on evicted executions', () => {
        const scopeStack = [
          { stepId: 'outerLoop', nodeId: 'enterForeach_outerLoop', nodeType: 'enter-foreach' },
        ];
        underTest.upsertStep({
          id: 'exec-1',
          stepId: 'innerStep',
          stepType: 'atomic',
          scopeStack,
          output: { data: 'old' },
        } as unknown as EsWorkflowStepExecution);
        underTest.upsertStep({
          id: 'exec-2',
          stepId: 'innerStep',
          stepType: 'atomic',
          output: { data: 'new' },
        } as unknown as EsWorkflowStepExecution);

        underTest.evictStaleLoopOutputs(['innerStep']);
      });
    });
  });
});
