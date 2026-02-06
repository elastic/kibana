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
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { createMockWorkflowEventLogger } from '../../workflow_event_logger/mocks';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/types';
import { StepExecutionRuntime } from '../step_execution_runtime';
import type { WorkflowContextManager } from '../workflow_context_manager';
import type { WorkflowExecutionState } from '../workflow_execution_state';

describe('StepExecutionRuntime', () => {
  let underTest: StepExecutionRuntime;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: WorkflowGraph;
  let workflowLogger: IWorkflowEventLogger;
  let workflowExecutionState: WorkflowExecutionState;
  let workflowContextManager: WorkflowContextManager;
  const fakeStepExecutionId = 'fake_step_execution_id';
  const fakeNode = {
    id: 'node1',
    stepId: 'fakeStepId1',
    stepType: 'fakeStepType1',
  } as GraphNodeUnion;
  const fakeStackFrames: StackFrame[] = [];
  const originalDateCtor = global.Date;
  let mockDateNow: Date;

  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length) {
        return new originalDateCtor(...args);
      }

      return mockDateNow;
    });
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    workflowLogger = createMockWorkflowEventLogger();
    workflowContextManager = {} as unknown as WorkflowContextManager;
    mockDateNow = new Date('2025-07-05T20:00:00.000Z');
    workflowExecution = {
      id: 'testWorkflowExecutionid',
      workflowId: 'test-workflow-id',
      scopeStack: [
        { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
        { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
      ] as StackFrame[],
      status: ExecutionStatus.RUNNING,
      createdAt: new Date('2025-08-05T19:00:00.000Z').toISOString(),
      startedAt: new Date('2025-08-05T20:00:00.000Z').toISOString(),
    } as EsWorkflowExecution;

    workflowExecutionState = {
      getWorkflowExecution: jest.fn().mockReturnValue(workflowExecution),
      updateWorkflowExecution: jest.fn(),
      getStepExecution: jest.fn(),
      getLatestStepExecution: jest.fn(),
      getStepExecutionsByStepId: jest.fn(),
      upsertStep: jest.fn(),
      load: jest.fn(),
      flush: jest.fn(),
      flushStepChanges: jest.fn(),
    } as unknown as WorkflowExecutionState;

    workflowExecutionGraph = {
      topologicalOrder: ['node1', 'node2', 'node3'],
    } as unknown as WorkflowGraph;

    workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
      switch (nodeId) {
        case 'node1':
          return {
            id: 'node1',
            stepId: 'fakeStepId1',
            stepType: 'fakeStepType1',
          } as GraphNodeUnion;
        case 'node2':
          return {
            id: 'node2',
            stepId: 'fakeStepId2',
            stepType: 'fakeStepType2',
          } as GraphNodeUnion;
        case 'node3':
          return {
            id: 'node3',
            stepId: 'fakeStepId3',
            stepType: 'fakeStepType3',
          } as GraphNodeUnion;
      }
    });

    underTest = new StepExecutionRuntime({
      node: fakeNode,
      stackFrames: fakeStackFrames,
      stepExecutionId: fakeStepExecutionId,
      contextManager: workflowContextManager,
      workflowExecutionGraph,
      stepLogger: workflowLogger,
      workflowExecutionState,
    });
  });

  describe('step result management', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should be able to retrieve the step result', () => {
      (workflowExecutionState.getStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        input: {},
        output: { success: true, data: {} },
        error: { type: 'Error', message: 'Fake error' },
      } as Partial<EsWorkflowStepExecution>);
      const stepResult = underTest.getCurrentStepResult();
      expect(workflowExecutionState.getStepExecution).toHaveBeenCalledWith(
        `fake_step_execution_id`
      );
      expect(stepResult).toEqual({
        input: {},
        output: { success: true, data: {} },
        error: new ExecutionError({ type: 'Error', message: 'Fake error' }),
      });
    });
  });

  describe('step state management', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should upsertStep with the fake step execution id', () => {
      underTest.setCurrentStepState({});
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fake_step_execution_id',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should update the step execution with the state and be able to retrieve it', () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        state: { success: true, data: {} },
      } as Partial<EsWorkflowStepExecution>);
      const fakeState = { success: true, data: {} };
      underTest.setCurrentStepState(fakeState);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'fakeStepId1',
          state: fakeState,
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should be able to retrieve the step state', () => {
      (workflowExecutionState.getStepExecution as jest.Mock).mockReturnValue({
        stepId: 'fakeStepId1',
        state: { success: true, data: {} },
      } as Partial<EsWorkflowStepExecution>);
      const stepState = underTest.getCurrentStepState();
      expect(workflowExecutionState.getStepExecution).toHaveBeenCalledWith(
        `fake_step_execution_id`
      );
      expect(stepState).toEqual({ success: true, data: {} });
    });
  });

  describe('startStep', () => {
    beforeEach(() => {
      (workflowExecutionState.getStepExecutionsByStepId as jest.Mock).mockReturnValue([]);
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
        currentNodeId: 'node1',
      } as Partial<EsWorkflowExecution>);
      mockDateNow = new Date('2023-01-01T00:00:00.000Z');
    });

    it('should upsertStep with the fake step execution id', () => {
      underTest.startStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fake_step_execution_id',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should create a step execution with "RUNNING" status', () => {
      underTest.startStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'fakeStepId1',
          topologicalIndex: 0,
          status: ExecutionStatus.RUNNING,
          startedAt: mockDateNow.toISOString(),
        })
      );
    });

    it('should log the start of step execution', () => {
      underTest.startStep();
      expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'fakeStepId1' started`, {
        event: { action: 'step-start', category: ['workflow', 'step'] },
        tags: ['workflow', 'step', 'start'],
        workflow: {
          step_id: 'fakeStepId1',
          step_execution_id: 'fake_step_execution_id',
        },
        labels: {
          connector_type: 'fakeStepType1',
          step_id: 'fakeStepId1',
          step_name: 'fakeStepId1',
          step_type: 'fakeStepType1',
        },
      });
    });

    it('should save step path from the workflow execution stack', () => {
      underTest.startStep();
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeStack: [
            { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
            { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
          ] as StackFrame[],
        })
      );
    });

    it('should save step type', () => {
      underTest.startStep();
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepType: 'fakeStepType1',
        })
      );
    });
  });

  describe('finishStep', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-06T00:00:00.000Z');
      (workflowExecutionState.getStepExecution as jest.Mock).mockImplementation(
        (stepExecutionId) => {
          if (stepExecutionId === 'fake_step_execution_id') {
            return {
              stepId: 'fakeStepId1',
              startedAt: '2025-08-06T00:00:00.000Z',
            } as Partial<EsWorkflowStepExecution>;
          }
        }
      );
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        currentNodeId: 'node1',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
      });
    });

    it('should correctly calculate step finishedAt and executionTimeMs', () => {
      const expectedFinishedAt = new Date('2025-08-06T00:00:02.000Z');
      mockDateNow = expectedFinishedAt;
      underTest.finishStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          finishedAt: expectedFinishedAt.toISOString(),
          executionTimeMs: 2000,
        })
      );
    });

    describe('step execution succeeds', () => {
      beforeEach(() => {
        (workflowExecutionState.getStepExecution as jest.Mock).mockImplementation(
          (stepExecutionId) => {
            if (stepExecutionId === 'fake_step_execution_id') {
              return {
                stepId: 'node1',
                startedAt: '2025-08-05T00:00:00.000Z',
                output: { success: true, data: {} },
                error: undefined,
              } as Partial<EsWorkflowStepExecution>;
            }
          }
        );
      });

      it('should upsert step with the fake step execution id', () => {
        underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'fake_step_execution_id',
          } as Partial<EsWorkflowStepExecution>)
        );
      });

      it('should finish a step execution with "COMPLETED" status', () => {
        underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.COMPLETED,
          })
        );
      });

      it('should finish a step execution executionTime', () => {
        underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            executionTimeMs: 86400000,
          })
        );
      });

      it('should log successful step execution', () => {
        underTest.finishStep();
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'fakeStepId1' completed`, {
          event: {
            action: 'step-complete',
            category: ['workflow', 'step'],
            outcome: 'success',
          },
          tags: ['workflow', 'step', 'complete'],
          workflow: {
            step_id: 'fakeStepId1',
            step_execution_id: 'fake_step_execution_id',
          },
          labels: {
            connector_type: 'fakeStepType1',
            execution_time_ms: 86400000,
            step_id: 'fakeStepId1',
            step_name: 'fakeStepId1',
            step_type: 'fakeStepType1',
          },
        });
      });
    });
  });

  describe('failStep', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should upsert step with the fake step execution id', () => {
      const error = new Error('Step execution failed');
      underTest.failStep(error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fake_step_execution_id',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it.each([
      {
        testName: 'JS error',
        inputError: new Error('Step execution failed'),
        expectedError: { type: 'Error', message: 'Step execution failed' },
      },
      {
        testName: 'execution error',
        inputError: new ExecutionError({ type: 'CustomError', message: 'Custom step error' }),
        expectedError: { type: 'CustomError', message: 'Custom step error' },
      },
    ])(
      'should mark the step as failed and map "$testName" error to execution error',
      async (testCase) => {
        const { inputError, expectedError } = testCase;
        await underTest.failStep(inputError);

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.FAILED,
            error: expectedError,
          })
        );
      }
    );

    it('should log the failure of the step', () => {
      const error = new Error('Step execution failed');
      underTest.failStep(error);

      expect(workflowLogger.logError).toHaveBeenCalledWith(
        `Step 'fakeStepId1' failed: Step execution failed`,
        error,
        {
          event: { action: 'step-fail', category: ['workflow', 'step'] },
          tags: ['workflow', 'step', 'fail'],
          labels: {
            step_type: 'fakeStepType1',
            connector_type: 'fakeStepType1',
            step_name: 'fakeStepId1',
            step_id: 'fakeStepId1',
          },
          workflow: {
            step_execution_id: 'fake_step_execution_id',
            step_id: 'fakeStepId1',
          },
        }
      );
    });
  });
});
