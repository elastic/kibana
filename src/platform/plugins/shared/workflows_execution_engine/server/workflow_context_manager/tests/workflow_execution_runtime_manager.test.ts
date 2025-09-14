/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';

import { graphlib } from '@dagrejs/dagre';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowExecutionState } from '../workflow_execution_state';

describe('WorkflowExecutionRuntimeManager', () => {
  let underTest: WorkflowExecutionRuntimeManager;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: graphlib.Graph;
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
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
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
      getLatestStepExecution: jest.fn(),
      getStepExecutionsByStepId: jest.fn(),
      upsertStep: jest.fn(),
      load: jest.fn(),
      flush: jest.fn(),
    } as unknown as WorkflowExecutionState;

    workflowExecutionGraph = new graphlib.Graph({ directed: true });
    workflowExecutionGraph.setNode('node1', {
      id: 'node1',
      configuration: { type: 'fakeStepType1' },
    });
    workflowExecutionGraph.setNode('node2', {
      id: 'node2',
      configuration: { type: 'fakeStepType2' },
    });
    workflowExecutionGraph.setNode('node3', {
      id: 'node3',
      configuration: { type: 'fakeStepType3' },
    });
    workflowExecutionGraph.setEdge('node1', 'node2');
    workflowExecutionGraph.setEdge('node2', 'node3');

    underTest = new WorkflowExecutionRuntimeManager({
      workflowExecution,
      workflowExecutionGraph,
      workflowLogger,
      workflowExecutionState,
    });
  });

  describe('getNodeSuccessors', () => {
    it('should return the successors of a given node', () => {
      const successors = underTest.getNodeSuccessors('node1');
      expect(successors).toEqual([expect.objectContaining({ id: 'node2' })]);
    });

    it('should return an empty array if the node has no successors', () => {
      const successors = underTest.getNodeSuccessors('node3');
      expect(successors).toEqual([]);
    });

    it('should return an empty array if the node does not exist', () => {
      const successors = underTest.getNodeSuccessors('nonexistent');
      expect(successors).toEqual([]);
    });
  });

  describe('nodes navigation', () => {
    it('should return the current executing node', () => {
      underTest.goToStep('node1');
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual(expect.objectContaining({ id: 'node1' }));
    });

    it('should return next node after calling gotToNextNode', () => {
      underTest.goToStep('node1'); // Start at node1
      underTest.goToNextStep();
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual(expect.objectContaining({ id: 'node2' }));
    });

    it('should go to a specific node', () => {
      underTest.goToStep('node3');
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual(expect.objectContaining({ id: 'node3' }));
    });
  });

  describe('step result management', () => {
    beforeEach(() => {
      underTest.goToStep('node1');
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      });
    });

    it('should usertStep with id built from execution id, current scopes and current node', async () => {
      const fakeResult = { success: true, data: {} };
      await underTest.setStepResult({
        input: {},
        output: fakeResult,
        error: null,
      });
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should update the step execution with the result and be able to retrieve it', async () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        id: 'step-execution-id',
        stepId: 'node1',
      } as Partial<EsWorkflowStepExecution>);
      const fakeResult = { success: true, data: {} };
      await underTest.setStepResult({
        input: {},
        output: fakeResult,
        error: null,
      });

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'node1',
          input: {},
          output: fakeResult,
          error: null,
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should be able to retrieve the step result', () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        id: 'step-execution-id',
        stepId: 'node1',
        output: { success: true, data: {} },
        error: 'Fake error',
      } as Partial<EsWorkflowStepExecution>);
      const stepResult = underTest.getStepResult('node1');
      expect(stepResult).toEqual({
        input: {},
        output: { success: true, data: {} },
        error: 'Fake error',
      });
    });
  });

  describe('step state management', () => {
    beforeEach(() => {
      underTest.goToStep('node1');
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      });
    });

    it('should usertStep with id built from execution id, current scopes and current node', async () => {
      const fakeState = { success: true, data: {} };
      await underTest.setStepState('node1', fakeState);
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should update the step execution with the state and be able to retrieve it', async () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        state: { success: true, data: {} },
      } as Partial<EsWorkflowStepExecution>);
      const fakeState = { success: true, data: {} };
      await underTest.setStepState('node1', fakeState);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'node1',
          state: fakeState,
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should be able to retrieve the step state', () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node1',
        state: { success: true, data: {} },
      } as Partial<EsWorkflowStepExecution>);
      const stepState = underTest.getStepState('node1');
      expect(stepState).toEqual({ success: true, data: {} });
    });
  });

  describe('start', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-05T20:00:00.000Z');
    });

    it('should set current step to the first node in the workflow', async () => {
      await underTest.start();
      expect(underTest.getCurrentStep()).toEqual(expect.objectContaining({ id: 'node1' }));
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

      expect(underTest.getCurrentStep()).toEqual(expect.objectContaining({ id: 'node2' }));
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
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      } as Partial<EsWorkflowExecution>);
      mockDateNow = new Date('2023-01-01T00:00:00.000Z');
      underTest.goToStep('node3');
    });

    it('should upsertStep with id built from execution id, current scopes and current node', async () => {
      await underTest.startStep('node3');

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowWxecutionId_firstScope_secondScope_node3',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should create a step execution with "RUNNING" status', async () => {
      await underTest.startStep('node3');

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'node3',
          topologicalIndex: 2,
          status: ExecutionStatus.RUNNING,
          startedAt: mockDateNow.toISOString(),
        })
      );
    });

    it('should log the start of step execution', async () => {
      await underTest.startStep('node3');
      expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'node3' started`, {
        event: { action: 'step-start', category: ['workflow', 'step'] },
        tags: ['workflow', 'step', 'start'],
        workflow: {
          step_id: 'node3',
          step_execution_id: 'testWorkflowWxecutionId_firstScope_secondScope_node3',
        },
        labels: {
          connector_type: 'unknown',
          step_id: 'node3',
          step_name: 'node3',
          step_type: 'unknown',
        },
      });
    });

    it('should save step path from the workflow execution stack', async () => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        stack: ['scope1', 'scope2', 'node3'],
      });
      await underTest.startStep('node3');
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          path: ['scope1', 'scope2', 'node3'],
        })
      );
    });

    it('should save step type', async () => {
      await underTest.startStep('node3');
      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepType: 'fakeStepType3',
        })
      );
    });
  });

  describe('finishStep', () => {
    beforeEach(async () => {
      mockDateNow = new Date('2025-08-06T00:00:00.000Z');
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
        stepId: 'node2',
        startedAt: '2025-08-06T00:00:00.000Z',
      } as Partial<EsWorkflowStepExecution>);
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      });
    });

    it('should throw error upon attempt to finish a step that is not running', async () => {
      (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue(undefined);
      await expect(underTest.finishStep('node2')).rejects.toThrowError(
        'Step execution not found for step ID: node2'
      );
    });

    it('should correctly calculate step completedAt and executionTimeMs', async () => {
      const expectedCompletedAt = new Date('2025-08-06T00:00:02.000Z');
      mockDateNow = expectedCompletedAt;
      await underTest.finishStep('node1');

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expectedCompletedAt.toISOString(),
          executionTimeMs: 2000,
        })
      );
    });

    describe('step execution succeeds', () => {
      beforeEach(async () => {
        (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
          stepId: 'node1',
          startedAt: '2025-08-06T00:00:00.000Z',
          output: { success: true, data: {} },
          error: null,
        } as Partial<EsWorkflowStepExecution>);
      });

      it('should upsert step with id built from execution id, current scopes and current node', async () => {
        await underTest.finishStep('node1');

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
          } as Partial<EsWorkflowStepExecution>)
        );
      });

      it('should finish a step execution with "COMPLETED" status', async () => {
        await underTest.finishStep('node1');

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.COMPLETED,
            output: { success: true, data: {} },
            error: null,
          })
        );
      });

      it('should log successful step execution', async () => {
        await underTest.finishStep('node1');
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'node1' completed`, {
          event: {
            action: 'step-complete',
            category: ['workflow', 'step'],
            outcome: 'success',
          },
          tags: ['workflow', 'step', 'complete'],
          workflow: {
            step_id: 'node1',
            step_execution_id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
          },
          labels: {
            connector_type: 'unknown',
            execution_time_ms: 0,
            step_id: 'node1',
            step_name: 'node1',
            step_type: 'unknown',
          },
        });
      });
    });

    describe('step execution fails', () => {
      beforeEach(async () => {
        (workflowExecutionState.getLatestStepExecution as jest.Mock).mockReturnValue({
          stepId: 'node1',
          startedAt: '2025-08-06T00:00:00.000Z',
          output: null,
          error: 'Step execution failed',
        } as Partial<EsWorkflowStepExecution>);
      });

      it('should upsert step with id built from execution id, current scopes and current node', async () => {
        await underTest.finishStep('node1');

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
          } as Partial<EsWorkflowStepExecution>)
        );
      });

      it('should finish a step execution with "FAILED" status', async () => {
        await underTest.finishStep('node1');

        expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.FAILED,
            output: null,
            error: 'Step execution failed',
          })
        );
      });

      it('should log successful step execution', async () => {
        await underTest.finishStep('node1');
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'node1' failed: Step execution failed`, {
          event: {
            action: 'step-complete',
            category: ['workflow', 'step'],
            outcome: 'failure',
          },
          tags: ['workflow', 'step', 'complete'],
          workflow: {
            step_id: 'node1',
            step_execution_id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
          },
          labels: {
            connector_type: 'unknown',
            execution_time_ms: 0,
            step_id: 'node1',
            step_name: 'node1',
            step_type: 'unknown',
          },
          error: {
            message: 'Step execution failed',
            stack_trace: undefined,
            type: 'WorkflowStepError',
          },
        });
      });
    });
  });

  describe('failStep', () => {
    beforeEach(() => {
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      });
    });

    it('should upsert step with id built from execution id, current scopes and current node', async () => {
      const stepId = 'node1';
      const error = new Error('Step execution failed');
      await underTest.failStep(stepId, error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
        } as Partial<EsWorkflowStepExecution>)
      );
    });

    it('should mark the step as failed', async () => {
      const stepId = 'node1';
      const error = new Error('Step execution failed');
      await underTest.failStep(stepId, error);

      expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId,
          status: ExecutionStatus.FAILED,
          error: String(error),
        })
      );
    });

    it('should log the failure of the step', async () => {
      const stepId = 'node1';
      const error = new Error('Step execution failed');
      await underTest.failStep(stepId, error);

      expect(workflowLogger.logError).toHaveBeenCalledWith(`Step 'node1' failed: Step execution failed`, error, {
        event: { action: 'step-fail', category: ['workflow', 'step'] },
        tags: ['workflow', 'step', 'fail'],
        workflow: {
          step_execution_id: 'testWorkflowWxecutionId_firstScope_secondScope_node1',
          step_id: 'node1',
        },
        labels: {
          connector_type: 'unknown',
          step_id: 'node1',
          step_name: 'node1',
          step_type: 'unknown',
        },
      });
    });
  });

  describe('saveState', () => {
    it('should save the current workflow execution state', async () => {
      await underTest.saveState();

      expect(workflowExecutionState.flush).toHaveBeenCalled();
    });

    beforeEach(async () => {
      mockDateNow = new Date('2025-08-06T00:00:04.000Z');
      underTest.goToStep('node3');
    });

    it('should complete workflow execution if no nodes to process', async () => {
      underTest.goToStep('node3'); // set execution to the last node
      underTest.goToNextStep(); // go to next node that will make current index to -1
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
      underTest.goToStep('node3'); // set execution to the last node
      underTest.goToNextStep(); // go to next node that will make current index to -1
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
      underTest.goToStep('node2');
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
      underTest.goToStep('node1');
    });

    it('should enter a new scope when no name is provided', () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        stack: ['some-scope'],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: ['some-scope', 'node1'],
        })
      );
    });

    it('should enter a new scope with the provided name', () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        stack: ['some-scope'],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope('my-scope');
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: ['some-scope', 'my-scope'],
        })
      );
    });
  });

  describe('exitScope', () => {
    beforeEach(() => {
      underTest.goToStep('node1');
    });

    it('should pop the last element', () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        stack: ['scope1', 'scope2'],
      } as Partial<EsWorkflowExecution>);
      underTest.exitScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: ['scope1'],
        })
      );
    });
  });

  describe('getCurrentStepExecutionId', () => {
    it('should return current step execution id built from execution id, current scopes and current node', () => {
      underTest.goToStep('node2');
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        id: 'testWorkflowWxecutionId',
        stack: ['firstScope', 'secondScope'],
      } as Partial<EsWorkflowExecution>);

      expect(underTest.getCurrentStepExecutionId()).toBe(
        'testWorkflowWxecutionId_firstScope_secondScope_node2'
      );
    });
  });
});
