/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';

import type { EsWorkflowExecution, EsWorkflowStepExecution, StackFrame } from '@kbn/workflows';
import type { GraphNode } from '@kbn/workflows/graph';
import { ExecutionStatus } from '@kbn/workflows';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowExecutionState } from '../workflow_execution_state';
import type { WorkflowGraph } from '@kbn/workflows/graph';

jest.mock('../../utils', () => ({
  buildStepExecutionId: jest.fn().mockImplementation((executionId, stepId, path) => {
    // Simulate the hashing behavior but return a predictable string for testing
    const pathParts = path.flatMap((x: StackFrame) => [x.stepId, x.subScopeId]).filter(Boolean);
    return `${executionId}_${pathParts.join('_')}_${stepId}`;
  }),
}));

describe('WorkflowExecutionRuntimeManager', () => {
  let underTest: WorkflowExecutionRuntimeManager;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: WorkflowGraph;
  let workflowLogger: IWorkflowEventLogger;
  let workflowExecutionState: WorkflowExecutionState;
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
    mockDateNow = new Date('2025-07-05T20:00:00.000Z');
    workflowExecution = {
      id: 'testWorkflowExecutionid',
      workflowId: 'test-workflow-id',
      scopeStack: [
        { nodeId: 'firstScope', stepId: 'firstScope' },
        { nodeId: 'secondScope', stepId: 'secondScope' },
      ] as StackFrame[],
      status: ExecutionStatus.RUNNING,
      createdAt: new Date('2025-08-05T19:00:00.000Z').toISOString(),
      startedAt: new Date('2025-08-05T20:00:00.000Z').toISOString(),
    } as EsWorkflowExecution;

    workflowLogger = {
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as unknown as IWorkflowEventLogger;

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
          return { id: 'node1', stepId: 'fakeStepId1', stepType: 'fakeStepType1' } as GraphNode;
        case 'node2':
          return { id: 'node2', stepId: 'fakeStepId2', stepType: 'fakeStepType2' } as GraphNode;
        case 'node3':
          return { id: 'node3', stepId: 'fakeStepId3', stepType: 'fakeStepType3' } as GraphNode;
      }
    });

    underTest = new WorkflowExecutionRuntimeManager({
      workflowExecution,
      workflowExecutionGraph,
      workflowLogger,
      workflowExecutionState,
    });
  });

  describe('nodes navigation', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node1',
      } as EsWorkflowExecution);
    });

    it('should return the current executing node', () => {
      const currentNode = underTest.getCurrentNode();
      expect(currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
    });

    describe('navigateToNode()', () => {
      it('should not change current executing node', () => {
        underTest.navigateToNode('node3');
        const currentNode = underTest.getCurrentNode();
        expect(currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
      });

      it('should change current node id in workflow execution state', () => {
        underTest.navigateToNode('node3');
        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            currentNodeId: 'node3',
          })
        );
      });
    });

    describe('navigateToNextNode()', () => {
      it('should not change current executing node', () => {
        underTest.navigateToNextNode();
        const currentNode = underTest.getCurrentNode();
        expect(currentNode).toEqual(expect.objectContaining({ id: 'node1' }));
      });

      it('should change current node id to undefined if no next node after calling saveState', async () => {
        workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
          currentNodeId: 'node3',
        } as EsWorkflowExecution);
        await underTest.saveState();
        underTest.navigateToNextNode();
        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            currentNodeId: undefined,
          })
        );
      });
    });
  });

  describe('step result management', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        stack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should usertStep with id built from execution id, current scopes and current node', async () => {
      const fakeResult = { success: true, data: {} };
      await underTest.setCurrentStepResult({
        input: {},
        output: fakeResult,
        error: null,
      });
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should update the step execution with the result', async () => {
      const fakeResult = { success: true, data: {} };
      await underTest.setCurrentStepResult({
        input: {},
        output: fakeResult,
        error: null,
      });

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'fakeStepId1',
          input: {},
          output: fakeResult,
          error: null,
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should be able to retrieve the step result', () => {
      (workflowExecutionState.getStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        output: { success: true, data: {} },
        error: 'Fake error',
      } as Partial<EsWorkflowStepExecution>);
      const stepResult = underTest.getCurrentStepResult();
      expect(workflowExecutionState.getStepExecution).toHaveBeenCalledWith(
        `testWorkflowExecutionId_firstScope_secondScope_fakeStepId1`
      );
      expect(stepResult).toEqual({
        input: {},
        output: { success: true, data: {} },
        error: 'Fake error',
      });
    });
  });

  describe('step state management', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        stack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should usertStep with id built from execution id, current scopes and current node', async () => {
      await underTest.setCurrentStepState({});
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should update the step execution with the state and be able to retrieve it', async () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        state: { success: true, data: {} },
      } as Partial<EsWorkflowStepExecution>);
      const fakeState = { success: true, data: {} };
      await underTest.setCurrentStepState(fakeState);

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
        `testWorkflowExecutionId_firstScope_secondScope_fakeStepId1`
      );
      expect(stepState).toEqual({ success: true, data: {} });
    });
  });

  describe('start', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-05T20:00:00.000Z');
    });

    it('should set current step to the first node in the workflow', async () => {
      await underTest.start();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          currentNodeId: 'node1',
          stack: [],
        })
      );
    });

    it('should start the workflow execution and update workflow status in runtime', async () => {
      await underTest.start();

      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-08-05T20:00:00.000Z',
        })
      );
      expect(underTest.getWorkflowExecutionStatus()).toBe(ExecutionStatus.RUNNING);
    });

    it('should log workflow start', async () => {
      await underTest.start();

      expect(workflowLogger.logInfo).toHaveBeenCalledWith('Workflow execution started', {
        event: { action: 'workflow-start', category: ['workflow'] },
        tags: ['workflow', 'execution', 'start'],
      });
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        currentNodeId: 'node2',
      } as Partial<EsWorkflowExecution>);
    });

    it('should not have RUNNING status before resuming', () => {
      expect(underTest.getWorkflowExecutionStatus()).not.toBe(ExecutionStatus.RUNNING);
    });

    it('should load workflow execution state', async () => {
      await underTest.resume();
      expect(workflowExecutionState.load).toHaveBeenCalled();
    });

    it('should set current step to the node from execution', async () => {
      await underTest.resume();

      expect(underTest.getCurrentNode()).toEqual(expect.objectContaining({ id: 'node2' }));
    });

    it('should update workflow status to RUNNING', async () => {
      await underTest.resume();

      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });
  });

  describe('startStep', () => {
    beforeEach(() => {
      (workflowExecutionState.getStepExecutionsByStepId as jest.Mock).mockReturnValue([]);
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
        currentNodeId: 'node1',
      } as Partial<EsWorkflowExecution>);
      mockDateNow = new Date('2023-01-01T00:00:00.000Z');
    });

    it('should upsertStep with id built from execution id, current scopes and current node', async () => {
      await underTest.startStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should create a step execution with "RUNNING" status', async () => {
      await underTest.startStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'fakeStepId1',
          path: ['firstScope', 'secondScope'],
          topologicalIndex: 0,
          status: ExecutionStatus.RUNNING,
          startedAt: mockDateNow.toISOString(),
        })
      );
    });

    it('should log the start of step execution', async () => {
      await underTest.startStep();
      expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'fakeStepId1' started`, {
        event: { action: 'step-start', category: ['workflow', 'step'] },
        tags: ['workflow', 'step', 'start'],
        workflow: {
          step_id: 'fakeStepId1',
          step_execution_id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
        },
        labels: {
          connector_type: 'fakeStepType1',
          step_id: 'fakeStepId1',
          step_name: 'fakeStepId1',
          step_type: 'fakeStepType1',
        },
      });
    });

    it('should save step path from the workflow execution stack', async () => {
      await underTest.startStep();
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          path: ['firstScope', 'secondScope'],
        })
      );
    });

    it('should save step type', async () => {
      await underTest.startStep();
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
          if (stepExecutionId === 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1') {
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
        stack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
      });
    });

    it('should correctly calculate step completedAt and executionTimeMs', async () => {
      const expectedCompletedAt = new Date('2025-08-06T00:00:02.000Z');
      mockDateNow = expectedCompletedAt;
      await underTest.finishStep();

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expectedCompletedAt.toISOString(),
          executionTimeMs: 2000,
        })
      );
    });

    describe('step execution succeeds', () => {
      beforeEach(async () => {
        (workflowExecutionState.getStepExecution as jest.Mock).mockImplementation(
          (stepExecutionId) => {
            if (stepExecutionId === 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1') {
              return {
                stepId: 'node1',
                startedAt: '2025-08-05T00:00:00.000Z',
                output: { success: true, data: {} },
                error: null,
              } as Partial<EsWorkflowStepExecution>;
            }
          }
        );
      });

      it('should upsert step with id built from execution id, current scopes and current node', async () => {
        await underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
          } as Partial<EsWorkflowStepExecution>)
        );
      });

      it('should finish a step execution with "COMPLETED" status', async () => {
        await underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.COMPLETED,
          })
        );
      });

      it('should finish a step execution executionTime', async () => {
        await underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            executionTimeMs: 86400000,
          })
        );
      });

      it('should log successful step execution', async () => {
        await underTest.finishStep();
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'fakeStepId1' completed`, {
          event: {
            action: 'step-complete',
            category: ['workflow', 'step'],
            outcome: 'success',
          },
          tags: ['workflow', 'step', 'complete'],
          workflow: {
            step_id: 'fakeStepId1',
            step_execution_id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
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

    describe('step execution fails', () => {
      beforeEach(async () => {
        (workflowExecutionState.getStepExecution as jest.Mock).mockImplementation(
          (stepExecutionId) => {
            if (stepExecutionId === 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1') {
              return {
                stepId: 'fakeStepId1',
                startedAt: '2025-08-06T00:00:00.000Z',
                output: null,
                error: 'Step execution failed',
              } as Partial<EsWorkflowStepExecution>;
            }
          }
        );
      });

      it('should upsert step with id built from execution id, current scopes and current node', async () => {
        await underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
          } as Partial<EsWorkflowStepExecution>)
        );
      });

      it('should finish a step execution with "FAILED" status', async () => {
        await underTest.finishStep();

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.FAILED,
            output: null,
            error: 'Step execution failed',
          })
        );
      });

      it('should log the failure of the step', async () => {
        const error = new Error('Step execution failed');
        await underTest.failStep(error);

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
              step_execution_id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
              step_id: 'fakeStepId1',
            },
          }
        );
      });
    });
  });

  describe('failStep', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowExecutionId',
        stack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
        currentNodeId: 'node1',
      });
    });

    it('should upsert step with id built from execution id, current scopes and current node', async () => {
      const error = new Error('Step execution failed');
      await underTest.failStep(error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should mark the step as failed', async () => {
      const error = new Error('Step execution failed');
      await underTest.failStep(error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
          error: String(error),
        })
      );
    });

    it('should upsert with current step path', async () => {
      const error = new Error('Step execution failed');
      await underTest.failStep(error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'fakeStepId1',
          path: ['firstScope', 'secondScope'],
        })
      );
    });

    it('should log the failure of the step', async () => {
      const error = new Error('Step execution failed');
      await underTest.failStep(error);

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
            step_execution_id: 'testWorkflowExecutionId_firstScope_secondScope_fakeStepId1',
            step_id: 'fakeStepId1',
          },
        }
      );
    });
  });

  describe('saveState', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-06T00:00:04.000Z');
      underTest.navigateToNode('node3');
    });

    it('should update local currentNodeId', async () => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node3',
      } as EsWorkflowExecution);
      await underTest.saveState();
      expect(underTest.getCurrentNode()).toEqual(expect.objectContaining({ id: 'node3' }));
    });

    it('should update local stack', async () => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
          { nodeId: 'thirdScope', stepId: 'thirdScope' },
        ] as StackFrame[],
      } as EsWorkflowExecution);
      await underTest.saveState();
      expect(underTest.getCurrentNodeScope()).toEqual([
        { nodeId: 'firstScope', stepId: 'firstScope' },
        { nodeId: 'secondScope', stepId: 'secondScope' },
        { nodeId: 'thirdScope', stepId: 'thirdScope' },
      ]);
    });

    it('should save the current workflow execution state', async () => {
      await underTest.saveState();

      expect(workflowExecutionState.flush).toHaveBeenCalled();
    });

    it('should complete workflow execution if no nodes to process', async () => {
      workflowExecution.currentNodeId = undefined;
      await underTest.saveState();

      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.COMPLETED,
          finishedAt: '2025-08-06T00:00:04.000Z',
          duration: 14404000,
        })
      );
    });

    it('should log workflow completion', async () => {
      workflowExecution.currentNodeId = undefined;
      await underTest.saveState();
      expect(workflowLogger.logInfo).toHaveBeenCalledWith(
        `Workflow execution completed successfully`,
        {
          event: {
            action: 'workflow-complete',
            category: ['workflow'],
            outcome: 'success',
          },
          tags: ['workflow', 'execution', 'complete'],
        }
      );
    });

    it('should fail workflow execution if workflow error is set', async () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        startedAt: '2025-08-05T00:00:00.000Z',
        error: 'Second step failed',
      } as Partial<EsWorkflowStepExecution>);
      await underTest.saveState();

      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
          finishedAt: '2025-08-06T00:00:04.000Z',
          duration: 86404000,
        })
      );
    });

    it('should save the current nodeId in workflow execution state', async () => {
      underTest.navigateToNode('node2');
      await underTest.saveState();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          currentNodeId: 'node2',
        })
      );
    });

    it('should log workflow failure', async () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        startedAt: '2025-08-05T00:00:00.000Z',
        error: 'Second step failed',
      } as Partial<EsWorkflowStepExecution>);
      await underTest.saveState();

      expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Workflow execution failed`, {
        event: {
          action: 'workflow-complete',
          category: ['workflow'],
          outcome: 'failure',
        },
        tags: ['workflow', 'execution', 'complete'],
      });
    });
  });

  describe('enterScope', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
    });

    it('should enter a new scope with step id when no name is provided', async () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        currentNodeId: 'node1',
        scopeStack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: [
            { nodeId: 'firstScope', stepId: 'firstScope' },
            { nodeId: 'secondScope', stepId: 'secondScope' },
            { nodeId: 'node1', stepId: 'fakeStepId1' },
          ],
        })
      );
    });

    it('should enter a new scope with the provided name', async () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        currentNodeId: 'node1',
        scopeStack: [
          { nodeId: 'firstScope', stepId: 'firstScope' },
          { nodeId: 'secondScope', stepId: 'secondScope' },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope('my-scope');
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: [
            { nodeId: 'firstScope', stepId: 'firstScope' },
            { nodeId: 'secondScope', stepId: 'secondScope' },
            { nodeId: 'node1', stepId: 'fakeStepId1', subScopeId: 'my-scope' },
          ],
        })
      );
    });
  });

  describe('exitScope', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
    });

    it('should pop the last element', async () => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node1',
        scopeStack: [
          { nodeId: 'scope1', stepId: 'scope1' },
          { nodeId: 'scope2', stepId: 'scope2' },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.exitScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: [{ nodeId: 'scope1', stepId: 'scope1' }],
        })
      );
    });
  });

  describe('getCurrentStepExecutionId', () => {
    it('should return current step execution id built from execution id, current scopes and current node', () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        id: 'testWorkflowExecutionId',
        scopeStack: [
          { nodeId: 'node1', stepId: 'fakeStepId1' },
          { nodeId: 'node2', stepId: 'fakeStepId2' },
        ] as StackFrame[],
        currentNodeId: 'node3',
      } as Partial<EsWorkflowExecution>);

      expect(underTest.getCurrentStepExecutionId()).toBe(
        'testWorkflowExecutionId_fakeStepId1_fakeStepId2_fakeStepId3'
      );
    });
  });
});
