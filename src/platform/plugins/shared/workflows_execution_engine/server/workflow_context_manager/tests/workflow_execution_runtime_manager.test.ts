/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';

import { EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { graphlib } from '@dagrejs/dagre';
import { RunStepResult } from '../../step/step_base';
import { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { StepExecutionRepository } from '../../repositories/step_execution_repository';
import { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

describe('WorkflowExecutionRuntimeManager', () => {
  let underTest: WorkflowExecutionRuntimeManager;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionRepository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;
  let workflowExecutionGraph: graphlib.Graph;
  let workflowLogger: IWorkflowEventLogger;
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
    workflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.RUNNING,
      createdAt: new Date('2025-08-05T19:00:00.000Z').toISOString(),
      startedAt: new Date('2025-08-05T20:00:00.000Z').toISOString(),
    } as EsWorkflowExecution;

    workflowExecutionRepository = {
      createWorkflowExecution: jest.fn(),
      updateWorkflowExecution: jest.fn(),
    } as unknown as WorkflowExecutionRepository;

    stepExecutionRepository = {
      createStepExecution: jest.fn(),
      updateStepExecution: jest.fn(),
      updateStepExecutions: jest.fn(),
    } as unknown as StepExecutionRepository;

    workflowLogger = {
      logInfo: jest.fn(),
      logWarn: jest.fn(),
      logDebug: jest.fn(),
      logError: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    workflowExecutionGraph = new graphlib.Graph({ directed: true });
    workflowExecutionGraph.setNode('node1', { id: 'node1' });
    workflowExecutionGraph.setNode('node2', { id: 'node2' });
    workflowExecutionGraph.setNode('node3', { id: 'node3' });
    workflowExecutionGraph.setEdge('node1', 'node2');
    workflowExecutionGraph.setEdge('node2', 'node3');

    underTest = new WorkflowExecutionRuntimeManager({
      workflowExecution,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowExecutionGraph,
      workflowLogger,
    });
  });

  describe('getNodeSuccessors', () => {
    it('should return the successors of a given node', () => {
      const successors = underTest.getNodeSuccessors('node1');
      expect(successors).toEqual([{ id: 'node2' }]);
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
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual({ id: 'node1' });
    });

    it('should return next node after calling gotToNextNode', () => {
      underTest.goToNextStep();
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual({ id: 'node2' });
    });

    it('should go to a specific node', () => {
      underTest.goToStep('node3');
      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual({ id: 'node3' });
    });
  });

  describe('step result management', () => {
    it('should update the step execution with the result and be able to retrieve it', async () => {
      const fakeResult = { success: true, data: {} };
      await underTest.setStepResult('node1', {
        output: fakeResult,
        error: null,
      });

      expect(underTest.getStepResult('node1')).toEqual({
        output: fakeResult,
        error: null,
      });
    });
  });

  describe('step state management', () => {
    it('should update the step execution with the result and be able to retrieve it', async () => {
      const fakeResult = { success: true, data: {} };
      void underTest.setStepState('node1', fakeResult);

      expect(underTest.getStepState('node1')).toEqual(fakeResult);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-05T20:00:00.000Z');
    });

    it('should start the workflow execution and update workflow status in runtime', async () => {
      await underTest.start();

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-workflow-execution-id',
          workflowId: 'test-workflow-id',
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

  describe('fail', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-06T00:00:04.000Z');
      underTest.goToStep('node2');
    });

    it('should fail the workflow execution', async () => {
      const error = new Error('Test error');
      await underTest.fail(error);

      expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.FAILED,
          error: 'Error: Test error', // String representation
          id: 'test-workflow-execution-id',
          traceId: 'test-workflow-execution-id',
          // Remove duration and finishedAt expectations
        })
      );
    });
  });

  describe('startStep', () => {
    beforeEach(() => {
      mockDateNow = new Date('2023-01-01T00:00:00.000Z');
      underTest.goToStep('node3');
    });

    it('should create a step execution with "RUNNING" status', async () => {
      await underTest.startStep('node3');

      expect(stepExecutionRepository.createStepExecution).toHaveBeenCalledWith({
        id: `test-workflow-execution-id-node3`,
        workflowId: 'test-workflow-id',
        workflowRunId: 'test-workflow-execution-id',
        stepId: 'node3',
        topologicalIndex: 2,
        status: ExecutionStatus.RUNNING,
        startedAt: mockDateNow.toISOString(),
      });
    });

    it('should log the start of step execution', async () => {
      await underTest.startStep('node3');
      expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'node3' started`, {
        event: { action: 'step-start', category: ['workflow', 'step'] },
        tags: ['workflow', 'step', 'start'],
      });
    });
  });

  describe('finishStep', () => {
    beforeEach(async () => {
      mockDateNow = new Date('2025-08-06T00:00:00.000Z');
      await underTest.startStep('node1');
    });

    it('should throw error upon attempt to finish a step that is not running', async () => {
      await expect(underTest.finishStep('node2')).rejects.toThrowError(
        'Step execution not found for step ID: node2'
      );
    });

    it('should correctly calculate step completedAt and executionTimeMs', async () => {
      const expectedCompletedAt = new Date('2025-08-06T00:00:02.000Z');
      mockDateNow = expectedCompletedAt;
      await underTest.finishStep('node1');

      expect(stepExecutionRepository.updateStepExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expectedCompletedAt.toISOString(),
          executionTimeMs: 2000,
        })
      );
    });

    describe('step execution succeeds', () => {
      beforeEach(async () => {
        const runStepResult: RunStepResult = {
          output: { success: true, data: {} },
          error: null,
        };

        await underTest.setStepResult('node1', runStepResult);
      });

      it('should finish a step execution with "COMPLETED" status', async () => {
        await underTest.finishStep('node1');

        expect(stepExecutionRepository.updateStepExecution).toHaveBeenCalledWith(
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
        });
      });
    });

    describe('step execution fails', () => {
      beforeEach(async () => {
        const runStepResult: RunStepResult = {
          output: null,
          error: new Error('Step execution failed'),
        };

        await underTest.setStepResult('node1', runStepResult);
      });

      it('should finish a step execution with "FAILED" status', async () => {
        await underTest.finishStep('node1');

        expect(stepExecutionRepository.updateStepExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.FAILED,
            output: null,
            error: new Error('Step execution failed'),
          })
        );
      });

      it('should log successful step execution', async () => {
        await underTest.finishStep('node1');
        expect(workflowLogger.logInfo).toHaveBeenCalledWith(`Step 'node1' failed`, {
          event: {
            action: 'step-complete',
            category: ['workflow', 'step'],
            outcome: 'failure',
          },
          tags: ['workflow', 'step', 'complete'],
        });
      });
    });

    it('should go to next step after finishing the current step', async () => {
      await underTest.finishStep('node1');

      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual({ id: 'node2' });
    });

    it('should leave the current step unchanged if it is explicitly changed', async () => {
      underTest.goToStep('node3');
      await underTest.finishStep('node1');

      const currentStep = underTest.getCurrentStep();
      expect(currentStep).toEqual({ id: 'node3' });
    });

    describe('workflow exection state management', () => {
      beforeEach(async () => {
        mockDateNow = new Date('2025-08-06T00:00:04.000Z');
        underTest.goToStep('node3');
        await underTest.startStep('node3');
      });

      it('should complete workflow execution if its last step succeeded', async () => {
        const runStepResult: RunStepResult = {
          output: { success: true, data: {} },
          error: null,
        };
        await underTest.setStepResult('node3', runStepResult);
        await underTest.finishStep('node3');

        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.COMPLETED,
            finishedAt: '2025-08-06T00:00:04.000Z',
            duration: 14404000,
          })
        );
      });

      it('should log workflow completion', async () => {
        const runStepResult: RunStepResult = {
          output: { success: true, data: {} },
          error: null,
        };
        await underTest.setStepResult('node3', runStepResult);
        await underTest.finishStep('node3');
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

      it('should fail workflow execution if its current step failed', async () => {
        underTest.goToStep('node2');
        await underTest.startStep('node2');
        const runStepResult: RunStepResult = {
          output: null,
          error: new Error('Second step failed'),
        };
        await underTest.setStepResult('node2', runStepResult);
        await underTest.finishStep('node2');

        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ExecutionStatus.FAILED,
            error: new Error('Second step failed'),
            finishedAt: '2025-08-06T00:00:04.000Z',
            duration: 14404000,
          })
        );
      });

      it('should log workflow failure', async () => {
        underTest.goToStep('node2');
        await underTest.startStep('node2');
        const runStepResult: RunStepResult = {
          output: null,
          error: new Error('Second step failed'),
        };
        await underTest.setStepResult('node2', runStepResult);
        await underTest.finishStep('node2');

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
  });

  describe('skipSteps', () => {
    it('should mark passed steps as skipped', async () => {
      const stepIds = ['node1', 'node2'];
      await underTest.skipSteps(stepIds);

      expect(stepExecutionRepository.updateStepExecutions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'test-workflow-execution-id-node1',
            workflowRunId: 'test-workflow-execution-id',
            stepId: 'node1',
            topologicalIndex: 0,
            status: ExecutionStatus.SKIPPED,
          }),
          expect.objectContaining({
            id: 'test-workflow-execution-id-node2',
            workflowRunId: 'test-workflow-execution-id',
            stepId: 'node2',
            topologicalIndex: 1,
            status: ExecutionStatus.SKIPPED,
          }),
        ])
      );
    });
  });
});
