/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock parseDuration function
jest.mock('../../../../utils', () => ({
  parseDuration: jest.fn(),
}));

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { parseDuration } from '../../../../utils';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterWorkflowTimeoutZoneNodeImpl } from '../enter_workflow_timeout_zone_node_impl';

const mockParseDuration = parseDuration as jest.MockedFunction<typeof parseDuration>;

describe('EnterWorkflowTimeoutZoneNodeImpl', () => {
  let node: EnterTimeoutZoneNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntimeFactoryMock: StepExecutionRuntimeFactory;
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

    wfExecutionRuntimeManagerMock = {
      getWorkflowExecution: jest.fn(),
      setWorkflowError: jest.fn(),
      navigateToNextNode: jest.fn(),
      markWorkflowTimeouted: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    stepExecutionRuntimeFactoryMock = {
      createStepExecutionRuntime: jest.fn(),
    } as unknown as StepExecutionRuntimeFactory;

    impl = new EnterWorkflowTimeoutZoneNodeImpl(
      node,
      wfExecutionRuntimeManagerMock,
      stepExecutionRuntimeFactoryMock
    );

    mockDateNow = new Date('2025-09-25T10:15:30.000Z');
    mockParseDuration.mockReturnValue(60000); // 60 seconds default
  });

  describe('run method', () => {
    it('should navigate to next node', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
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
        failStep: jest.fn(),
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
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
      expect(monitoredStepExecutionRuntimeMock.failStep).not.toHaveBeenCalled();
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).not.toHaveBeenCalled();
    });

    it('should abort and fail workflow when timeout exceeded', async () => {
      const startTime = new Date().getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Mock empty scope stack (no nested scopes to fail)
      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(monitoredStepExecutionRuntimeMock.failStep).toHaveBeenCalledWith(expect.any(Error));
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should fail all nested scope steps when timeout exceeded', async () => {
      const startTime = new Date().getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Mock nested scopes to fail
      const scope1 = { nodeId: 'nested-step-1' };
      const scope2 = { nodeId: 'nested-step-2' };

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

      // Mock created step execution runtime from factory
      const scopeStepExecutionRuntime1 = {
        stepExecution: { id: 'nested-step-1' },
        failStep: jest.fn(),
      } as unknown as StepExecutionRuntime;

      const scopeStepExecutionRuntime2 = {
        stepExecution: { id: 'nested-step-2' },
        failStep: jest.fn(),
      } as unknown as StepExecutionRuntime;

      (stepExecutionRuntimeFactoryMock.createStepExecutionRuntime as jest.Mock)
        .mockReturnValueOnce(scopeStepExecutionRuntime1)
        .mockReturnValueOnce(scopeStepExecutionRuntime2);

      impl.monitor(nestedMonitoredStepExecutionRuntime);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(monitoredStepExecutionRuntimeMock.failStep).toHaveBeenCalledWith(expect.any(Error));

      // Should fail both nested scopes
      expect(scopeStepExecutionRuntime1.failStep).toHaveBeenCalledWith(expect.any(Error));
      expect(scopeStepExecutionRuntime2.failStep).toHaveBeenCalledWith(expect.any(Error));

      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should erase workflow error to prevent workflow from being marked as failed', async () => {
      const startTime = new Date().getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Mock empty scope stack (no nested scopes to fail)
      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(wfExecutionRuntimeManagerMock.setWorkflowError).toHaveBeenCalledWith(undefined);
    });

    it('should handle different timeout formats', async () => {
      node.timeout = '2m'; // 2 minutes
      const startTime = new Date().getTime() - 60000; // 1 minute ago (within 2m limit)
      mockParseDuration.mockReturnValue(120000); // 2 minutes
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(parseDuration).toHaveBeenCalledWith('2m');
      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should parse timeout correctly for various duration formats', async () => {
      const recentStartTime = new Date().getTime() - 1000; // 1 second ago (within any reasonable timeout)

      // Test seconds
      node.timeout = '30s';
      mockParseDuration.mockReturnValue(30000);
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(recentStartTime).toISOString(),
      });
      impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('30s');

      // Test minutes
      node.timeout = '5m';
      mockParseDuration.mockReturnValue(300000);
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(recentStartTime).toISOString(),
      });
      impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('5m');

      // Test hours
      node.timeout = '1h';
      mockParseDuration.mockReturnValue(3600000);
      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(recentStartTime).toISOString(),
      });
      impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(parseDuration).toHaveBeenCalledWith('1h');
    });

    it('should use correct time calculations', async () => {
      const startTime = mockDateNow.getTime() - 90000; // 90 seconds ago (exceeds 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });

    it('should return resolved Promise in all cases', async () => {
      const startTime = new Date().getTime() - 30000;

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      const result = impl.monitor(monitoredStepExecutionRuntimeMock);
      expect(result).toBeUndefined(); // void returns undefined
    });

    it('should handle edge case where timeout exactly equals current duration', async () => {
      const startTime = new Date().getTime() - 60000; // exactly 60 seconds ago
      mockParseDuration.mockReturnValue(60000); // exactly 60 seconds timeout

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      impl.monitor(monitoredStepExecutionRuntimeMock);

      // Should not timeout when duration equals timeout limit (using > comparison)
      expect(monitoredStepExecutionRuntimeMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should timeout when duration is greater than timeout by 1ms', async () => {
      const startTime = new Date().getTime() - 60001; // 60001ms ago (just over 60s timeout)
      mockParseDuration.mockReturnValue(60000); // 60 seconds

      wfExecutionRuntimeManagerMock.getWorkflowExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      (monitoredStepExecutionRuntimeMock.scopeStack.isEmpty as jest.Mock).mockReturnValue(true);

      impl.monitor(monitoredStepExecutionRuntimeMock);

      expect(monitoredStepExecutionRuntimeMock.abortController.abort).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.markWorkflowTimeouted).toHaveBeenCalledTimes(1);
    });
  });
});
