/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution, StackFrame } from '@kbn/workflows';
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
    expect(() => underTest.upsertStep({})).toThrow(
      'WorkflowExecutionState: Step execution must have an ID to be upserted'
    );
  });

  it('should reject input/output writes through upsertStep', () => {
    expect(() =>
      underTest.upsertStep({ id: 'fake-id', output: { a: 1 } } as unknown as EsWorkflowStepExecution)
    ).toThrow('WorkflowExecutionState: input/output writes must go through setStepIo');
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
    // `as Partial<EsWorkflowStepExecution>` keeps the assertion focused on
    // the fields that createStep actually fills in; spaceId/topologicalIndex
    // come from upstream callers (workflow context / runtime) and are not
    // injected by createStep itself.
    expect(underTest.getLatestStepExecution('test-step-execution-id')).toEqual({
      id: 'fake-id',
      workflowRunId: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      stepId: 'test-step-execution-id',
      // `scopeStack` is required on the schema; createStep now defaults to []
      // when the caller did not supply one (previously it left undefined,
      // which would write `null` into ES on bulk upsert).
      scopeStack: [],
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
      stepExecutionIndex: 0,
      globalExecutionIndex: 0,
      isTestRun: false,
      managed: false,
    } as Partial<EsWorkflowStepExecution>);
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

  it('should set managed on step execution from workflow execution', () => {
    const state = new WorkflowExecutionState(
      {
        id: 'test-workflow-execution-id',
        workflowId: 'test-workflow-id',
        status: ExecutionStatus.RUNNING,
        startedAt: '2025-08-05T20:00:00.000Z',
        isTestRun: false,
        managed: true,
      } as EsWorkflowExecution,
      workflowExecutionRepository,
      stepExecutionRepository
    );

    state.upsertStep({
      id: 'fake-id',
      stepId: 'test-step',
      status: ExecutionStatus.RUNNING,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowStepExecution);

    expect(state.getLatestStepExecution('test-step')).toEqual(
      expect.objectContaining({ managed: true })
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

      await underTest.flushWorkflowAndSteps();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        updatedWorkflowExecution,
        {}
      );
    });

    it('should flush workflow execution changes with execution id even if execution id is not in change', async () => {
      const updatedWorkflowExecution = {} as EsWorkflowExecution;

      underTest.updateWorkflowExecution(updatedWorkflowExecution);

      await underTest.flushWorkflowAndSteps();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id',
        }),
        {}
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

      await underTest.flushWorkflowAndSteps();

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
      await underTest.flushWorkflowAndSteps(); // initial flush to create the step execution

      // update step execution
      underTest.upsertStep({
        id: 'fake-uuid-1',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2025-08-05T20:01:00.000Z',
        executionTimeMs: 60000,
      } as EsWorkflowStepExecution);

      await underTest.flushWorkflowAndSteps();

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

      await underTest.flushWorkflowAndSteps();

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
      await underTest.flushWorkflowAndSteps();

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
      await underTest.flushWorkflowAndSteps(); // initial flush to create the step execution

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
      await underTest.flushWorkflowAndSteps(); // first flush that flushes everything
      await underTest.flushWorkflowAndSteps(); // second flush with no changes
      await underTest.flushWorkflowAndSteps(); // third flush with no changes

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledTimes(2);
      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledTimes(2);
    });

    it('should persist step IO together with step metadata in one bulk upsert', async () => {
      underTest.upsertStep({
        id: 'io-step',
        stepId: 'test-step-execution-id',
        status: ExecutionStatus.COMPLETED,
      } as EsWorkflowStepExecution);
      underTest.setStepIo('io-step', { input: { in: 1 }, output: { out: 2 } });

      await underTest.flushStepChanges();

      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledTimes(1);
      expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'io-step',
          status: ExecutionStatus.COMPLETED,
          input: { in: 1 },
          output: { out: 2 },
        }),
      ]);
    });

    it('should drop flushed outputs from memory but keep inputs readable', async () => {
      underTest.upsertStep({ id: 'io-step', stepId: 'test-step-execution-id' });
      underTest.setStepIo('io-step', { input: { in: 1 }, output: { out: 2 } });

      await underTest.flushStepChanges();

      expect(underTest.getStepIo('io-step', 'output')).toBeUndefined();
      expect(underTest.getStepIo('io-step', 'input')).toEqual({ in: 1 });
    });

    it('should keep an output that was rewritten while the bulk write was in flight', async () => {
      underTest.upsertStep({ id: 'io-step', stepId: 'test-step-execution-id' });
      underTest.setStepIo('io-step', { output: { version: 1 } });
      (stepExecutionRepository.bulkUpsert as jest.Mock).mockImplementation(async () => {
        underTest.setStepIo('io-step', { output: { version: 2 } });
      });

      await underTest.flushStepChanges();

      expect(underTest.getStepIo('io-step', 'output')).toEqual({ version: 2 });
    });

    it('should flush step changes before a terminal workflow status', async () => {
      const callOrder: string[] = [];
      (stepExecutionRepository.bulkUpsert as jest.Mock).mockImplementation(async () => {
        callOrder.push('steps');
      });
      (workflowExecutionRepository.updateWorkflowExecution as jest.Mock).mockImplementation(
        async () => {
          callOrder.push('workflow');
        }
      );
      underTest.upsertStep({ id: 'io-step', stepId: 'test-step-execution-id' });
      underTest.updateWorkflowExecution({ status: ExecutionStatus.COMPLETED });

      await underTest.flushWorkflowAndSteps();

      expect(callOrder).toEqual(['steps', 'workflow']);
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

    describe('scoped to parallel branches', () => {
      const branchFrames = (branchIndex: number): StackFrame[] => [
        {
          stepId: 'fanOut',
          nestedScopes: [
            {
              nodeId: 'enterParallel_fanOut',
              nodeType: 'enter-parallel',
              scopeId: branchIndex.toString(),
            },
          ],
        },
      ];

      beforeEach(() => {
        underTest.upsertStep({ id: 'outside', stepId: 'mark', scopeStack: [] });
        underTest.upsertStep({ id: 'branch-0', stepId: 'mark', scopeStack: branchFrames(0) });
        underTest.upsertStep({ id: 'branch-1', stepId: 'mark', scopeStack: branchFrames(1) });
      });

      it('returns the execution from the reader branch, skipping later sibling branches', () => {
        expect(underTest.getLatestStepExecution('mark', branchFrames(0))?.id).toBe('branch-0');
      });

      it('falls back to an execution outside the parallel when the branch has none', () => {
        expect(underTest.getLatestStepExecution('mark', branchFrames(2))?.id).toBe('outside');
      });

      it('keeps last-write-wins for readers outside any parallel branch', () => {
        expect(underTest.getLatestStepExecution('mark', [])?.id).toBe('branch-1');
        expect(underTest.getLatestStepExecution('mark')?.id).toBe('branch-1');
      });

      it('keeps branches of an earlier, already joined fan-out visible', () => {
        const otherFanOutFrames: StackFrame[] = [
          {
            stepId: 'fanOutB',
            nestedScopes: [
              { nodeId: 'enterParallel_fanOutB', nodeType: 'enter-parallel', scopeId: '0' },
            ],
          },
        ];

        expect(underTest.getLatestStepExecution('mark', otherFanOutFrames)?.id).toBe('branch-1');
      });

      it('scopes each loop iteration to its own fan-out', () => {
        const iterationFrames = (iteration: number, branchIndex: number): StackFrame[] => [
          {
            stepId: 'loop',
            nestedScopes: [
              { nodeId: 'enterForeach_loop', nodeType: 'enter-foreach', scopeId: `${iteration}` },
            ],
          },
          ...branchFrames(branchIndex),
        ];
        underTest.upsertStep({
          id: 'iter-0-branch-0',
          stepId: 'inner',
          scopeStack: iterationFrames(0, 0),
        });
        underTest.upsertStep({
          id: 'iter-1-branch-0',
          stepId: 'inner',
          scopeStack: iterationFrames(1, 0),
        });
        underTest.upsertStep({
          id: 'iter-1-branch-1',
          stepId: 'inner',
          scopeStack: iterationFrames(1, 1),
        });

        expect(underTest.getLatestStepExecution('inner', iterationFrames(1, 0))?.id).toBe(
          'iter-1-branch-0'
        );
        expect(underTest.getLatestStepExecution('inner', iterationFrames(1, 2))?.id).toBe(
          'iter-0-branch-0'
        );
      });
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

    it('should load inputs into the live IO map and leave outputs to on-demand rehydration', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11', '22'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'connectorStep',
          stepType: 'connector',
          status: ExecutionStatus.COMPLETED,
          input: { url: 'https://example.com' },
        } as unknown as EsWorkflowStepExecution,
        {
          id: '22',
          stepId: 'dataSetStep',
          stepType: 'data.set',
          status: ExecutionStatus.COMPLETED,
        } as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      expect(underTest.getStepIo('11', 'input')).toEqual({ url: 'https://example.com' });
      expect(underTest.getStepIo('11', 'output')).toBeUndefined();
      expect(underTest.getStepIo('22', 'output')).toBeUndefined();
      expect(underTest.getDataSetStepExecutions().map((step) => step.id)).toEqual(['22']);
      // A single fetch: outputs are no longer eagerly fetched for any step type.
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);
    });

    it('should not queue loaded inputs for the next flush', async () => {
      underTest.updateWorkflowExecution({ stepExecutionIds: ['11'] });
      (stepExecutionRepository.getStepExecutionsByIds as jest.Mock).mockResolvedValue([
        {
          id: '11',
          stepId: 'connectorStep',
          input: { already: 'persisted' },
        } as unknown as EsWorkflowStepExecution,
      ]);
      await underTest.load();

      await underTest.flushStepChanges();

      expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
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

  describe('accumulateUsage', () => {
    it('sets the per-execution usage from the first reporting step', () => {
      underTest.accumulateUsage({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
        totalTokens: 150,
      });

      expect(underTest.getWorkflowExecution().usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
        totalTokens: 150,
      });
    });

    it('sums usage across multiple steps', () => {
      underTest.accumulateUsage({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
        totalTokens: 150,
      });
      underTest.accumulateUsage({
        inputTokens: 200,
        outputTokens: 80,
        cachedTokens: 40,
        totalTokens: 280,
      });

      expect(underTest.getWorkflowExecution().usage).toEqual({
        inputTokens: 300,
        outputTokens: 130,
        cachedTokens: 65,
        totalTokens: 430,
      });
    });

    it('persists the accumulated usage on the next workflow-doc flush', async () => {
      underTest.accumulateUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
      await underTest.flushWorkflowDoc();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id',
          usage: { inputTokens: 100, outputTokens: 50, cachedTokens: 0, totalTokens: 150 },
        }),
        {}
      );
    });

    it('is a no-op when usage is undefined (steps that report nothing)', () => {
      underTest.accumulateUsage(undefined);
      expect(underTest.getWorkflowExecution().usage).toBeUndefined();
    });
  });

  describe('recordStepUsage', () => {
    it('appends each step as a distinct entry in finish order, even on the same connector', () => {
      // Two steps sharing a connector must not be merged — that is the reason
      // this list exists alongside the summed `usage`.
      underTest.recordStepUsage({
        stepId: 'run_investigator_agent',
        connectorId: '.openai-gpt-5.2',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
      underTest.recordStepUsage({
        stepId: 'run_judge_agent',
        connectorId: '.openai-gpt-5.2',
        inputTokens: 200,
        outputTokens: 80,
        totalTokens: 280,
      });

      expect(underTest.getWorkflowExecution().stepUsage).toEqual([
        {
          stepId: 'run_investigator_agent',
          connectorId: '.openai-gpt-5.2',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        {
          stepId: 'run_judge_agent',
          connectorId: '.openai-gpt-5.2',
          inputTokens: 200,
          outputTokens: 80,
          totalTokens: 280,
        },
      ]);
    });

    it('persists the per-step breakdown on the next workflow-doc flush', async () => {
      underTest.recordStepUsage({
        stepId: 'run_investigator_agent',
        connectorId: '.openai-gpt-5.2',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
      await underTest.flushWorkflowDoc();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id',
          stepUsage: [
            {
              stepId: 'run_investigator_agent',
              connectorId: '.openai-gpt-5.2',
              inputTokens: 100,
              outputTokens: 50,
              totalTokens: 150,
            },
          ],
        }),
        {}
      );
    });
  });
});
