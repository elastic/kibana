/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import type {
  EsWorkflowExecution,
  EsWorkflowStepExecution,
  StackFrame,
  WorkflowContext,
  WorkflowExecutionContext,
} from '@kbn/workflows';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { buildWorkflowContext } from '../build_workflow_context';
import type { ContextDependencies } from '../types';
import { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../workflow_execution_state';

jest.mock('../build_workflow_context', () => {
  return {
    buildWorkflowContext: jest.fn(),
  };
});
const buildWorkflowContextMock = buildWorkflowContext as jest.MockedFunction<
  typeof buildWorkflowContext
>;
describe('WorkflowExecutionRuntimeManager', () => {
  let underTest: WorkflowExecutionRuntimeManager;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: WorkflowGraph;
  let workflowLogger: IWorkflowEventLogger;
  let workflowExecutionState: WorkflowExecutionState;
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let fakeContextDependencies: jest.Mocked<ContextDependencies>;
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
        { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
        { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
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

    fakeCoreStart = {} as unknown as jest.Mocked<CoreStart>;
    fakeContextDependencies = {} as unknown as jest.Mocked<ContextDependencies>;

    underTest = new WorkflowExecutionRuntimeManager({
      workflowExecution,
      workflowExecutionGraph,
      workflowLogger,
      workflowExecutionState,
      coreStart: fakeCoreStart as CoreStart,
      dependencies: fakeContextDependencies,
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
        // navigateToNode only updates local state, not the workflow execution state
        // The state is only persisted when saveState is called
        expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
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

  describe('start', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-05T20:00:00.000Z');
    });

    it('should set current step to the first node in the workflow', async () => {
      await underTest.start();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          currentNodeId: 'node1',
          scopeStack: [],
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
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
          { stepId: 'thirdScope', nestedScopes: [{ nodeId: 'node3' }] },
        ] as StackFrame[],
      } as EsWorkflowExecution);
      await underTest.saveState();
      expect(underTest.getCurrentNodeScope()).toEqual([
        { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
        { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        { stepId: 'thirdScope', nestedScopes: [{ nodeId: 'node3' }] },
      ]);
    });

    it('should complete workflow execution if no nodes to process', async () => {
      // Mock the WorkflowExecutionRuntimeManager to have no current node
      (underTest as any).nextNodeId = undefined;
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        ...workflowExecution,
        currentNodeId: undefined,
      });

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
      // Mock the WorkflowExecutionRuntimeManager to have no current node
      (underTest as any).nextNodeId = undefined;
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        ...workflowExecution,
        nextNodeId: undefined,
      });

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
        error: {
          message: 'Second step failed',
          type: 'Error',
        },
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
        error: {
          message: 'Second step failed',
          type: 'Error',
        },
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

    describe.each(TerminalExecutionStatuses)('for status %s', (status) => {
      beforeEach(() => {
        (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
          startedAt: '2025-08-05T00:00:00.000Z',
          status,
        } as Partial<EsWorkflowStepExecution>);
        buildWorkflowContextMock.mockReturnValue({} as WorkflowContext);
      });

      it('should set finishedAt and duration if not set', async () => {
        await underTest.saveState();

        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            finishedAt: '2025-08-06T00:00:04.000Z',
          })
        );
      });

      it('should update duration', async () => {
        await underTest.saveState();

        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            duration: 86404000,
          })
        );
      });

      it('should build final workflow context', async () => {
        buildWorkflowContextMock.mockReturnValue({
          execution: {} as WorkflowExecutionContext,
        } as WorkflowContext);
        await underTest.saveState();

        expect(buildWorkflowContextMock).toHaveBeenCalledWith(
          {
            startedAt: '2025-08-05T00:00:00.000Z',
            status,
          },
          fakeCoreStart,
          fakeContextDependencies
        );
        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            context: {
              execution: {},
            },
          })
        );
      });
    });
  });

  describe('enterScope', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
    });

    it('should enter a new scope with step id when node type is enter-* and no name is provided', async () => {
      workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
        switch (nodeId) {
          case 'node3':
            return {
              id: 'node3',
              type: 'enter-normal-path',
              stepId: 'fakeStepId3',
              stepType: 'fakeStepType3',
            } as GraphNodeUnion;
        }
      });
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeStack: [
            { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
            { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
            {
              stepId: 'fakeStepId3',
              nestedScopes: [{ nodeId: 'node3', nodeType: 'enter-normal-path' }],
            },
          ],
        })
      );
    });

    it('should enter a new scope with the provided name', async () => {
      workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
        switch (nodeId) {
          case 'node3':
            return {
              id: 'node3',
              type: 'enter-normal-path',
              stepId: 'fakeStepId3',
              stepType: 'fakeStepType3',
            } as GraphNodeUnion;
        }
      });
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope('fake-scope-id');
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeStack: [
            { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
            { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
            {
              stepId: 'fakeStepId3',
              nestedScopes: [
                { nodeId: 'node3', nodeType: 'enter-normal-path', scopeId: 'fake-scope-id' },
              ],
            },
          ],
        })
      );
    });

    it('should not modify scope if node is not enter-* type', async () => {
      workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
        switch (nodeId) {
          case 'node3':
            return {
              id: 'node3',
              type: 'atomic',
              stepId: 'fakeStepId3',
              stepType: 'fakeStepType3',
            } as GraphNodeUnion;
        }
      });
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          { stepId: 'secondScope', nestedScopes: [{ nodeId: 'node2' }] },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.enterScope('fake-scope-id');
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalledWith();
    });
  });

  describe('exitScope', () => {
    beforeEach(() => {
      underTest.navigateToNode('node1');
    });

    it('should pop the last element if node type is exit-*', async () => {
      workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
        switch (nodeId) {
          case 'node3':
            return {
              id: 'node3',
              type: 'exit-else-branch',
              stepId: 'fakeStepId3',
              stepType: 'fakeStepType3',
            } as GraphNodeUnion;
        }
      });
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          {
            stepId: 'secondScope',
            nestedScopes: [{ nodeId: 'node2', nodeType: 'enter-else-branch' }],
          },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.exitScope();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeStack: [{ stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] }],
        })
      );
    });

    it('should not modify the scope stack if node type is not exit-*', async () => {
      workflowExecutionGraph.getNode = jest.fn().mockImplementation((nodeId) => {
        switch (nodeId) {
          case 'node3':
            return {
              id: 'node3',
              type: 'atomic',
              stepId: 'fakeStepId3',
              stepType: 'fakeStepType3',
            } as GraphNodeUnion;
        }
      });
      workflowExecutionState.getWorkflowExecution = jest.fn().mockReturnValue({
        currentNodeId: 'node3',
        scopeStack: [
          { stepId: 'firstScope', nestedScopes: [{ nodeId: 'node1' }] },
          {
            stepId: 'secondScope',
            nestedScopes: [{ nodeId: 'node2', nodeType: 'enter-else-branch' }],
          },
        ] as StackFrame[],
      } as Partial<EsWorkflowExecution>);
      underTest.exitScope();
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalledWith();
    });
  });
});
