/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import agent from 'elastic-apm-node';
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
import {
  createWorkflowExecutionCursorTestHarness,
  type WorkflowExecutionCursorTestHarness,
} from '../mocks/workflow_execution_cursor.mock';
import type { StepIoService } from '../step_io_service';
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
  let workflowExecutionCursor: WorkflowExecutionCursorTestHarness;
  let workflowExecution: EsWorkflowExecution;
  let workflowExecutionGraph: WorkflowGraph;
  let stepIoService: StepIoService;
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
      getAllStepExecutions: jest.fn().mockReturnValue([]),
      upsertStep: jest.fn(),
    } as unknown as WorkflowExecutionState;

    workflowExecutionGraph = {
      topologicalOrder: ['node1', 'node2', 'node3'],
      getInnerStepIds: jest.fn().mockReturnValue(new Set<string>()),
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

    workflowExecutionGraph.getNodeStack = jest
      .fn()
      .mockImplementation((nodeId: string) => [nodeId]);

    fakeCoreStart = {} as unknown as jest.Mocked<CoreStart>;
    fakeContextDependencies = {} as unknown as jest.Mocked<ContextDependencies>;

    workflowExecutionCursor = createWorkflowExecutionCursorTestHarness({
      nodeId: 'node1',
      stackFrames: workflowExecution.scopeStack,
      workflowExecutionGraph,
    });

    stepIoService = {
      getOutputSizeStats: jest.fn().mockReturnValue({ totalBytes: 0, stepCount: 0 }),
      flush: jest.fn().mockResolvedValue(undefined),
      flushStepChanges: jest.fn().mockResolvedValue(undefined),
      load: jest.fn().mockResolvedValue(undefined),
      evictStaleLoopOutputs: jest.fn(),
      // Drives the eviction work that used to live in this class — tests that
      // observe stale-loop eviction now spy on this method directly.
      evictCompletedLoopsOnResume: jest.fn(),
    } as unknown as StepIoService;

    underTest = new WorkflowExecutionRuntimeManager({
      workflowExecution,
      workflowExecutionGraph,
      workflowExecutionCursor,
      workflowLogger,
      workflowExecutionState,
      stepIoService,
      coreStart: fakeCoreStart as CoreStart,
      dependencies: fakeContextDependencies,
    });
  });

  describe('nodes navigation', () => {
    beforeEach(() => {
      workflowExecutionCursor = createWorkflowExecutionCursorTestHarness({
        nodeId: 'node1',
        workflowExecutionGraph,
      });
      underTest = new WorkflowExecutionRuntimeManager({
        workflowExecution,
        workflowExecutionGraph,
        workflowExecutionCursor,
        workflowLogger,
        workflowExecutionState,
        stepIoService,
        coreStart: fakeCoreStart as CoreStart,
        dependencies: fakeContextDependencies,
      });
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

      it('should persist undefined currentNodeId when there is no next node after commit', async () => {
        workflowExecutionCursor = createWorkflowExecutionCursorTestHarness({
          nodeId: 'node3',
          workflowExecutionGraph,
        });
        underTest = new WorkflowExecutionRuntimeManager({
          workflowExecution,
          workflowExecutionGraph,
          workflowExecutionCursor,
          workflowLogger,
          workflowExecutionState,
          stepIoService,
          coreStart: fakeCoreStart as CoreStart,
          dependencies: fakeContextDependencies,
        });
        underTest.navigateToNextNode();
        workflowExecutionCursor.commitPendingNavigation();
        await underTest.saveState();
        expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            currentNodeId: undefined,
            status: ExecutionStatus.COMPLETED,
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

    describe('task manager APM labels (event-driven)', () => {
      let mockTransaction: {
        addLabels: jest.Mock;
        ids: Record<string, string>;
        outcome: string;
        _labels: Record<string, unknown>;
      };

      beforeEach(() => {
        mockTransaction = {
          addLabels: jest.fn(),
          ids: { 'transaction.id': 'txn-1', 'trace.id': 'trace-1' },
          outcome: 'success',
          _labels: {},
        };
        Object.defineProperty(agent, 'currentTransaction', {
          configurable: true,
          enumerable: true,
          get: () => mockTransaction,
        });
      });

      afterEach(() => {
        Reflect.deleteProperty(agent, 'currentTransaction');
        workflowExecution.triggeredBy = undefined;
        workflowExecution.context = {} as EsWorkflowExecution['context'];
      });

      it('adds event_trigger_id when triggeredBy is an event trigger id', async () => {
        workflowExecution.triggeredBy = 'cases.caseCreated';
        workflowExecution.context = {
          event: { eventChainDepth: 2 },
        } as EsWorkflowExecution['context'];

        await underTest.start();

        expect(mockTransaction.addLabels.mock.calls[0][0]).toMatchObject({
          triggered_by: 'task_manager',
          event_trigger_id: 'cases.caseCreated',
        });
        expect(mockTransaction.addLabels.mock.calls[0][0]).not.toHaveProperty('event_chain_depth');
      });

      it('adds event_trigger_id when context.event has no chain depth', async () => {
        workflowExecution.triggeredBy = 'my.custom.trigger';
        workflowExecution.context = {} as EsWorkflowExecution['context'];

        await underTest.start();

        expect(mockTransaction.addLabels.mock.calls[0][0]).toMatchObject({
          triggered_by: 'task_manager',
          event_trigger_id: 'my.custom.trigger',
        });
        expect(mockTransaction.addLabels.mock.calls[0][0]).not.toHaveProperty('event_chain_depth');
      });

      it('does not add event labels for well-known triggeredBy values', async () => {
        workflowExecution.triggeredBy = 'scheduled';
        workflowExecution.context = {} as EsWorkflowExecution['context'];

        await underTest.start();

        const labels = mockTransaction.addLabels.mock.calls[0][0] as Record<string, unknown>;
        expect(labels).toMatchObject({
          triggered_by: 'task_manager',
          workflow_execution_id: workflowExecution.id,
        });
        expect(labels).not.toHaveProperty('event_trigger_id');
        expect(labels).not.toHaveProperty('event_chain_depth');
      });
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        currentNodeId: 'node2',
      } as Partial<EsWorkflowExecution>);
      workflowExecutionCursor = createWorkflowExecutionCursorTestHarness({
        nodeId: 'node1',
        workflowExecutionGraph,
      });
      underTest = new WorkflowExecutionRuntimeManager({
        workflowExecution,
        workflowExecutionGraph,
        workflowExecutionCursor,
        workflowLogger,
        workflowExecutionState,
        stepIoService,
        coreStart: fakeCoreStart as CoreStart,
        dependencies: fakeContextDependencies,
      });
    });

    it('should not have RUNNING status before resuming', () => {
      expect(underTest.getWorkflowExecutionStatus()).not.toBe(ExecutionStatus.RUNNING);
    });

    it('should load workflow execution state', async () => {
      await underTest.resume();
      expect(stepIoService.load).toHaveBeenCalled();
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

    describe('evictCompletedLoopOutputs (delegation)', () => {
      // The actual eviction logic lives in StepIoService.evictCompletedLoopsOnResume
      // and is exercised by step_io_service.test.ts. Here we only verify the
      // runtime manager delegates correctly: load() must complete first, then
      // the eviction call is made with the workflow graph.
      it('delegates loop eviction to StepIoService.evictCompletedLoopsOnResume', async () => {
        await underTest.resume();

        expect(stepIoService.evictCompletedLoopsOnResume).toHaveBeenCalledWith(
          workflowExecutionGraph
        );
      });

      it('delegates after load() so the service sees fully-loaded state', async () => {
        const callOrder: string[] = [];
        (stepIoService.load as jest.Mock).mockImplementation(async () => {
          callOrder.push('load');
        });
        (stepIoService.evictCompletedLoopsOnResume as jest.Mock).mockImplementation(() => {
          callOrder.push('evict');
        });

        await underTest.resume();

        expect(callOrder).toEqual(['load', 'evict']);
      });
    });
  });

  describe('saveState', () => {
    beforeEach(() => {
      mockDateNow = new Date('2025-08-06T00:00:04.000Z');
      underTest.navigateToNode('node3');
    });

    it('should update local currentNodeId after pending navigation is committed', async () => {
      workflowExecutionCursor.commitPendingNavigation();
      await underTest.saveState();
      expect(underTest.getCurrentNode()).toEqual(expect.objectContaining({ id: 'node3' }));
    });

    it('should persist scope stack from the execution cursor', async () => {
      workflowExecutionCursor.commitPendingNavigation();
      await underTest.saveState();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeStack: expect.any(Array),
        })
      );
    });

    it('should complete workflow execution if no nodes to process', async () => {
      workflowExecutionCursor.setCurrentNodeId(undefined);

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
      workflowExecutionCursor.setCurrentNodeId(undefined);

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
        ...workflowExecution,
        startedAt: '2025-08-05T00:00:00.000Z',
      });
      underTest.setWorkflowError(new Error('Second step failed'));
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
      workflowExecutionCursor.commitPendingNavigation();
      await underTest.saveState();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          currentNodeId: 'node2',
        })
      );
    });

    it('should log workflow failure', async () => {
      (workflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...workflowExecution,
        startedAt: '2025-08-05T00:00:00.000Z',
      });
      underTest.setWorkflowError(new Error('Second step failed'));
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
    const navigateToEnterNode = (nodeMock: GraphNodeUnion) => {
      workflowExecutionGraph.getNode = jest.fn().mockReturnValue(nodeMock);
      underTest.navigateToNode('node3');
      workflowExecutionCursor.commitPendingNavigation();
    };

    it('should enter a new scope with step id when node type is enter-* and no name is provided', async () => {
      navigateToEnterNode({
        id: 'node3',
        type: 'enter-normal-path',
        stepId: 'fakeStepId3',
        stepType: 'fakeStepType3',
      } as GraphNodeUnion);
      underTest.enterScope();
      expect(underTest.getCurrentNodeScope()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stepId: 'fakeStepId3',
            nestedScopes: [expect.objectContaining({ nodeId: 'node3' })],
          }),
        ])
      );
    });

    it('should enter a new scope with the provided name', async () => {
      navigateToEnterNode({
        id: 'node3',
        type: 'enter-normal-path',
        stepId: 'fakeStepId3',
        stepType: 'fakeStepType3',
      } as GraphNodeUnion);
      underTest.enterScope('fake-scope-id');
      const scopeStack = underTest.getCurrentNodeScope();
      const lastFrame = scopeStack[scopeStack.length - 1];
      expect(lastFrame.nestedScopes[0]).toEqual(
        expect.objectContaining({
          nodeId: 'node3',
          nodeType: 'enter-normal-path',
          scopeId: 'fake-scope-id',
        })
      );
    });

    it('should add scope entry for the current node via setCurrentScopeId', async () => {
      navigateToEnterNode({
        id: 'node3',
        type: 'atomic',
        stepId: 'fakeStepId3',
        stepType: 'fakeStepType3',
      } as GraphNodeUnion);
      underTest.enterScope('fake-scope-id');
      expect(underTest.getCurrentNodeScope()).toEqual([
        expect.objectContaining({
          stepId: 'fakeStepId3',
          nestedScopes: [
            expect.objectContaining({
              nodeId: 'node3',
              scopeId: 'fake-scope-id',
            }),
          ],
        }),
      ]);
    });
  });

  describe('getTraceId', () => {
    it('should return the workflow execution id', () => {
      expect(underTest.getTraceId()).toBe('testWorkflowExecutionid');
    });
  });

  describe('getEntryTransactionId', () => {
    it('should return undefined initially', () => {
      expect(underTest.getEntryTransactionId()).toBeUndefined();
    });
  });

  describe('getWorkflowExecution', () => {
    it('should return the current workflow execution from state', () => {
      const result = underTest.getWorkflowExecution();
      expect(result).toBe(workflowExecution);
    });
  });

  describe('getCurrentNode', () => {
    it('should return null when the execution cursor has no current node', () => {
      workflowExecutionCursor.setCurrentNodeId(undefined);
      expect(underTest.getCurrentNode()).toBeNull();
    });
  });

  describe('navigateToNode', () => {
    it('should throw when nodeId is not in the graph', () => {
      (workflowExecutionGraph.getNode as jest.Mock).mockReturnValue(undefined);
      expect(() => underTest.navigateToNode('nonexistent')).toThrow(
        'Node with ID nonexistent is not part of the workflow graph'
      );
    });
  });

  describe('navigateToAfterNode', () => {
    it('should set next node to the one after the given nodeId', async () => {
      underTest.navigateToAfterNode('node1');
      workflowExecutionCursor.commitPendingNavigation();
      await underTest.saveState();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ currentNodeId: 'node2' })
      );
    });

    it('should set next node to undefined when given the last node', async () => {
      workflowExecutionCursor = createWorkflowExecutionCursorTestHarness({
        nodeId: 'node3',
        workflowExecutionGraph,
      });
      underTest = new WorkflowExecutionRuntimeManager({
        workflowExecution,
        workflowExecutionGraph,
        workflowExecutionCursor,
        workflowLogger,
        workflowExecutionState,
        stepIoService,
        coreStart: fakeCoreStart as CoreStart,
        dependencies: fakeContextDependencies,
      });
      underTest.navigateToAfterNode('node3');
      workflowExecutionCursor.commitPendingNavigation();
      await underTest.saveState();
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ currentNodeId: undefined, status: ExecutionStatus.COMPLETED })
      );
    });
  });

  describe('setWorkflowOutputs', () => {
    it('should update context with output', () => {
      underTest.setWorkflowOutputs({ result: 'done' });
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        context: expect.objectContaining({ output: { result: 'done' } }),
      });
    });
  });

  describe('setWorkflowStatus', () => {
    it('should update status', () => {
      underTest.setWorkflowStatus(ExecutionStatus.FAILED);
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.FAILED,
      });
    });
  });

  describe('setWorkflowCancelled', () => {
    it('should update status to CANCELLED with reason and metadata', () => {
      underTest.setWorkflowCancelled('user requested');
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.CANCELLED,
        cancellationReason: 'user requested',
        cancelledAt: '2025-07-05T20:00:00.000Z',
        cancelledBy: 'workflow',
      });
    });
  });

  describe('getWorkflowErrorSerialized', () => {
    it('should return serialized error from the execution cursor', () => {
      underTest.setWorkflowError(new Error('something broke'));
      expect(underTest.getWorkflowErrorSerialized()).toEqual(
        expect.objectContaining({ type: 'Error', message: 'something broke' })
      );
    });

    it('should return undefined when cursor has no error', () => {
      expect(underTest.getWorkflowErrorSerialized()).toBeUndefined();
    });
  });

  describe('setWorkflowError', () => {
    it('should serialize and set error on the execution cursor', () => {
      underTest.setWorkflowError(new Error('something broke'));
      expect(workflowExecutionCursor.error).toEqual(
        expect.objectContaining({ message: 'something broke' })
      );
    });

    it('should clear driver error when passed undefined', () => {
      underTest.setWorkflowError(new Error('something broke'));
      underTest.setWorkflowError(undefined);
      expect(workflowExecutionCursor.error).toBeUndefined();
    });
  });

  describe('markWorkflowTimeouted', () => {
    it('should set status to TIMED_OUT with finishedAt and duration', () => {
      const stopSpy = jest.spyOn(workflowExecutionCursor, 'stop');

      underTest.markWorkflowTimeouted();

      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ExecutionStatus.TIMED_OUT,
          finishedAt: '2025-07-05T20:00:00.000Z',
        })
      );
      expect(stopSpy).toHaveBeenCalled();

      stopSpy.mockRestore();
    });
  });

  describe('unwindScopes', () => {
    const setExecutionCursorStack = (stackFrames: StackFrame[]) => {
      (workflowExecutionCursor as unknown as { stackFrames: StackFrame[] }).stackFrames =
        stackFrames.map((frame) => ({
          stepId: frame.stepId,
          nestedScopes: frame.nestedScopes.map((scope) => ({ ...scope })),
        }));
    };

    it('should unwind all scopes when no shouldStop predicate is given', () => {
      setExecutionCursorStack([
        {
          stepId: 'step1',
          nestedScopes: [{ nodeId: 'n1', nodeType: 'enter-foreach' }],
        },
        {
          stepId: 'step2',
          nestedScopes: [{ nodeId: 'n2', nodeType: 'enter-if' }],
        },
      ]);

      const mockFactory = {
        createStepExecutionRuntime: jest.fn().mockReturnValue({
          stepExecutionExists: jest.fn().mockReturnValue(true),
          finishStep: jest.fn(),
        }),
      };

      underTest.unwindScopes(mockFactory as any);

      expect(mockFactory.createStepExecutionRuntime).toHaveBeenCalledTimes(2);
      expect(mockFactory.createStepExecutionRuntime).toHaveBeenNthCalledWith(1, {
        nodeId: 'n2',
        stackFrames: [
          {
            stepId: 'step1',
            nestedScopes: [{ nodeId: 'n1', nodeType: 'enter-foreach' }],
          },
        ],
      });
      expect(mockFactory.createStepExecutionRuntime).toHaveBeenNthCalledWith(2, {
        nodeId: 'n1',
        stackFrames: [],
      });
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should stop before the matching scope (exclusive) when shouldStop matches', () => {
      setExecutionCursorStack([
        {
          stepId: 'loopStep',
          nestedScopes: [{ nodeId: 'loop', nodeType: 'enter-foreach' }],
        },
        {
          stepId: 'innerStep',
          nestedScopes: [{ nodeId: 'inner', nodeType: 'enter-if' }],
        },
      ]);

      const mockFactory = {
        createStepExecutionRuntime: jest.fn().mockReturnValue({
          stepExecutionExists: jest.fn().mockReturnValue(false),
          finishStep: jest.fn(),
        }),
      };

      underTest.unwindScopes(mockFactory as any, (scope) => scope.nodeType === 'enter-foreach');

      expect(mockFactory.createStepExecutionRuntime).toHaveBeenCalledTimes(1);
      expect(mockFactory.createStepExecutionRuntime).toHaveBeenCalledWith({
        nodeId: 'inner',
        stackFrames: [
          {
            stepId: 'loopStep',
            nestedScopes: [{ nodeId: 'loop', nodeType: 'enter-foreach' }],
          },
        ],
      });
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should include the matching scope when inclusive is true', () => {
      setExecutionCursorStack([
        {
          stepId: 'loopStep',
          nestedScopes: [{ nodeId: 'loop', nodeType: 'enter-foreach' }],
        },
      ]);

      const mockFactory = {
        createStepExecutionRuntime: jest.fn().mockReturnValue({
          stepExecutionExists: jest.fn().mockReturnValue(true),
          finishStep: jest.fn(),
        }),
      };

      underTest.unwindScopes(mockFactory as any, (scope) => scope.nodeType === 'enter-foreach', {
        inclusive: true,
      });

      expect(mockFactory.createStepExecutionRuntime).toHaveBeenCalledTimes(1);
      expect(mockFactory.createStepExecutionRuntime).toHaveBeenCalledWith({
        nodeId: 'loop',
        stackFrames: [],
      });
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('saveState with APM transaction', () => {
    it('should end workflow transaction for alerting-triggered workflows on terminal status', async () => {
      const mockEnd = jest.fn();
      (underTest as any).workflowTransaction = {
        type: 'workflow_execution',
        outcome: 'success',
        end: mockEnd,
      };
      workflowExecutionCursor.setCurrentNodeId(undefined);

      await underTest.saveState();

      expect(mockEnd).toHaveBeenCalled();
    });

    it('should not end transaction for task-manager-triggered workflows', async () => {
      const mockEnd = jest.fn();
      (underTest as any).workflowTransaction = {
        type: 'task',
        outcome: 'success',
        end: mockEnd,
      };
      workflowExecutionCursor.setCurrentNodeId(undefined);

      await underTest.saveState();

      expect(mockEnd).not.toHaveBeenCalled();
    });
  });

  describe('reportTelemetryIfTerminal', () => {
    it('should report telemetry when terminal status and telemetry client is available', async () => {
      const mockReport = jest.fn();
      const telemetryClient = { reportWorkflowExecutionTerminated: mockReport };
      (underTest as any).telemetryClient = telemetryClient;
      workflowExecutionCursor.setCurrentNodeId(undefined);

      (workflowExecutionState as any).getAllStepExecutions = jest.fn().mockReturnValue([]);

      await underTest.saveState();

      expect(mockReport).toHaveBeenCalledWith(
        expect.objectContaining({
          finalStatus: ExecutionStatus.COMPLETED,
        })
      );
    });

    it('should not report telemetry twice', async () => {
      const mockReport = jest.fn();
      const telemetryClient = { reportWorkflowExecutionTerminated: mockReport };
      (underTest as any).telemetryClient = telemetryClient;
      workflowExecutionCursor.setCurrentNodeId(undefined);
      (workflowExecutionState as any).getAllStepExecutions = jest.fn().mockReturnValue([]);

      await underTest.saveState();
      await underTest.saveState();

      expect(mockReport).toHaveBeenCalledTimes(1);
    });
  });
});
