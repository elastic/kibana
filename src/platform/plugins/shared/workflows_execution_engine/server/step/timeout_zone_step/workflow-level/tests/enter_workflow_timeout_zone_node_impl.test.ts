/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { ExecutionStatus } from '@kbn/workflows';
import { EnterWorkflowTimeoutZoneNodeImpl } from '../enter_workflow_timeout_zone_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../../../../workflow_context_manager/workflow_execution_state';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';

// Mock parseDuration function
jest.mock('../../../../utils', () => ({
  parseDuration: jest.fn(),
  buildStepExecutionId: jest.fn((workflowId, stepId, stackFrames) => {
    return `${workflowId}-${stepId}-${stackFrames.length}`;
  }),
}));

import { parseDuration } from '../../../../utils';

const mockParseDuration = parseDuration as jest.MockedFunction<typeof parseDuration>;

describe('EnterWorkflowTimeoutZoneNodeImpl', () => {
  let node: EnterTimeoutZoneNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let wfExecutionStateMock: WorkflowExecutionState;
  let stepExecutionRuntimeMock: StepExecutionRuntime;
  let impl: EnterWorkflowTimeoutZoneNodeImpl;

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
    jest.clearAllMocks();

    node = {
      id: 'test-workflow-timeout-zone',
      type: 'enter-timeout-zone',
      stepId: 'workflowTimeoutStep',
      stepType: 'workflow_level_timeout',
      timeout: '60s',
    };

    stepExecutionRuntimeMock = {
      startStep: jest.fn().mockResolvedValue(undefined),
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManagerMock = {
      navigateToNextNode: jest.fn(),
      markWorkflowTimeouted: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    wfExecutionStateMock = {} as unknown as WorkflowExecutionState;
    wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({});
    wfExecutionStateMock.upsertStep = jest.fn();
    wfExecutionStateMock.getWorkflowExecution = jest.fn().mockReturnValue({
      id: 'workflow-execution-id',
    });

    impl = new EnterWorkflowTimeoutZoneNodeImpl(
      node,
      wfExecutionRuntimeManagerMock,
      wfExecutionStateMock,
      stepExecutionRuntimeMock
    );

    mockDateNow = new Date('2025-09-25T10:15:30.000Z');
    mockParseDuration.mockReturnValue(60000); // 60 seconds default
  });

  describe('run method', () => {
    it('should start step', async () => {
      await impl.run();
      expect(stepExecutionRuntimeMock.startStep).toHaveBeenCalledTimes(1);
      expect(stepExecutionRuntimeMock.startStep).toHaveBeenCalledWith();
    });

    it('should navigate to next node', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
    });

    it('should execute methods in correct order', async () => {
      const callOrder: string[] = [];

      stepExecutionRuntimeMock.startStep = jest.fn().mockImplementation(() => {
        callOrder.push('startStep');
        return Promise.resolve();
      });
      wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn().mockImplementation(() => {
        callOrder.push('navigateToNextNode');
      });

      await impl.run();

      expect(callOrder).toEqual(['startStep', 'navigateToNextNode']);
    });
  });

  describe('monitor method', () => {
    let monitoredStepExecutionRuntimeMock: StepExecutionRuntime;

    beforeEach(() => {
      monitoredStepExecutionRuntimeMock = {
        stepExecutionId: 'monitored-step-123',
        abortController: {
          abort: jest.fn(),
        },
        scopeStack: {
          isEmpty: jest.fn(),
          getCurrentScope: jest.fn(),
          exitScope: jest.fn(),
          stackFrames: [],
        } as any,
      } as any as StepExecutionRuntime;
    });

    it('should not abort or fail steps when within timeout limit', async () => {
      const startTime = new Date().getTime() - 30000; // 30 seconds ago (within 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
      expect(wfExecutionStateMock.upsertStep).not.toHaveBeenCalled();
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).not.toHaveBeenCalled();
    });

    it('should abort and fail workflow when timeout exceeded', async () => {
      const startTime = new Date().getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Mock empty scope stack (no nested scopes to fail)
      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(wfExecutionStateMock.upsertStep).toHaveBeenCalledWith({
        id: 'monitored-step-123',
        status: ExecutionStatus.FAILED,
      });
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should fail all nested scope steps when timeout exceeded', async () => {
      const startTime = new Date().getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Mock nested scopes to fail
      const scope1 = { stepId: 'nested-step-1' };
      const scope2 = { stepId: 'nested-step-2' };

      const mockNestedStack1 = {
        isEmpty: jest.fn().mockReturnValue(false),
        getCurrentScope: jest.fn().mockReturnValue(scope1),
        exitScope: jest.fn(),
        stackFrames: [{ stepId: 'step1' }, { stepId: 'step2' }],
      };

      const mockNestedStack2 = {
        isEmpty: jest.fn().mockReturnValue(false),
        getCurrentScope: jest.fn().mockReturnValue(scope2),
        exitScope: jest.fn(),
        stackFrames: [{ stepId: 'step1' }],
      };

      const mockEmptyStack = {
        isEmpty: jest.fn().mockReturnValue(true),
        stackFrames: [],
      };

      // Create a new monitored context with proper nested stack
      const nestedMonitoredStepExecutionRuntime = {
        ...monitoredStepExecutionRuntimeMock,
        scopeStack: mockNestedStack1,
      } as unknown as StepExecutionRuntime;

      // Mock the chained calls for exitScope
      mockNestedStack1.exitScope.mockReturnValue(mockNestedStack2);
      mockNestedStack2.exitScope.mockReturnValue(mockEmptyStack);

      await impl.monitor(nestedMonitoredStepExecutionRuntime);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);

      // Should fail the monitored step first
      expect(wfExecutionStateMock.upsertStep).toHaveBeenCalledWith({
        id: 'monitored-step-123',
        status: ExecutionStatus.FAILED,
      });

      // Should fail both nested scopes
      expect(wfExecutionStateMock.upsertStep).toHaveBeenCalledWith({
        id: 'workflow-execution-id-nested-step-1-1', // buildStepExecutionId mock result
        status: ExecutionStatus.FAILED,
      });
      expect(wfExecutionStateMock.upsertStep).toHaveBeenCalledWith({
        id: 'workflow-execution-id-nested-step-2-0', // buildStepExecutionId mock result
        status: ExecutionStatus.FAILED,
      });

      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should handle different timeout formats', async () => {
      node.timeout = '2m'; // 2 minutes
      const startTime = new Date().getTime() - 60000; // 1 minute ago (within 2m limit)
      mockParseDuration.mockReturnValue(120000); // 2 minutes

      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(parseDuration).toHaveBeenCalledWith('2m');
      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should parse timeout correctly for various duration formats', async () => {
      // Test seconds
      node.timeout = '30s';
      mockParseDuration.mockReturnValue(30000);
      await impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('30s');

      // Test minutes
      node.timeout = '5m';
      mockParseDuration.mockReturnValue(300000);
      await impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('5m');

      // Test hours
      node.timeout = '1h';
      mockParseDuration.mockReturnValue(3600000);
      await impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('1h');
    });

    it('should get step execution using step execution id from step execution runtime', async () => {
      const startTime = new Date().getTime() - 30000;
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Add stepExecutionId to the step execution runtime mock
      (stepExecutionRuntimeMock as any).stepExecutionId = 'step-execution-runtime-id';

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(wfExecutionStateMock.getStepExecution).toHaveBeenCalledWith(
        'step-execution-runtime-id'
      );
    });

    it('should use correct time calculations', async () => {
      const startTime = mockDateNow.getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should return resolved Promise in all cases', async () => {
      const startTime = new Date().getTime() - 30000;
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      const result = await impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(result).toBeUndefined(); // Promise<void> resolves to undefined
    });

    it('should handle edge case where timeout exactly equals current duration', async () => {
      const startTime = new Date().getTime() - 60000; // exactly 60 seconds ago
      mockParseDuration.mockReturnValue(60000); // exactly 60 seconds timeout

      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      // Should not timeout when duration equals timeout limit (using > comparison)
      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should timeout when duration is greater than timeout by 1ms', async () => {
      const startTime = new Date().getTime() - 60001; // 60001ms ago (just over 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      await impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });
  });
});
