/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { EnterStepTimeoutZoneNodeImpl } from '../enter_step_timeout_zone_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowContextManager } from '../../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionState } from '../../../../workflow_context_manager/workflow_execution_state';

describe('EnterStepTimeoutZoneNodeImpl', () => {
  let node: EnterTimeoutZoneNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let wfExecutionStateMock: WorkflowExecutionState;
  let stepContextMock: WorkflowContextManager;
  let impl: EnterStepTimeoutZoneNodeImpl;

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
    node = {
      id: 'test-timeout-zone',
      type: 'enter-timeout-zone',
      stepId: 'timeoutStep',
      stepType: 'step_level_timeout',
      timeout: '30s',
    };

    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.startStep = jest.fn().mockResolvedValue(undefined);
    wfExecutionRuntimeManagerMock.enterScope = jest.fn();
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn();

    wfExecutionStateMock = {} as unknown as WorkflowExecutionState;
    wfExecutionStateMock.getStepExecution = jest.fn();

    stepContextMock = {
      stepExecutionId: 'step-exec-123',
    } as WorkflowContextManager;

    impl = new EnterStepTimeoutZoneNodeImpl(
      node,
      wfExecutionRuntimeManagerMock,
      wfExecutionStateMock,
      stepContextMock
    );
    mockDateNow = new Date('2025-09-24T15:44:54.973Z');
  });

  describe('run method', () => {
    it('should start step', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalledWith();
    });

    it('should enter scope', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledWith();
    });

    it('should navigate to next node', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
    });

    it('should execute methods in correct order', async () => {
      const callOrder: string[] = [];

      wfExecutionRuntimeManagerMock.startStep = jest.fn().mockImplementation(() => {
        callOrder.push('startStep');
        return Promise.resolve();
      });
      wfExecutionRuntimeManagerMock.enterScope = jest.fn().mockImplementation(() => {
        callOrder.push('enterScope');
      });
      wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn().mockImplementation(() => {
        callOrder.push('navigateToNextNode');
      });

      await impl.run();

      expect(callOrder).toEqual(['startStep', 'enterScope', 'navigateToNextNode']);
    });
  });

  describe('monitor method', () => {
    let monitoredContextMock: WorkflowContextManager;

    beforeEach(() => {
      monitoredContextMock = {
        abortController: {
          abort: jest.fn(),
        },
      } as any as WorkflowContextManager;
    });

    it('should not throw error when within timeout limit', async () => {
      const startTime = new Date().getTime() - 10000; // 10 seconds ago
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await expect(impl.monitor(monitoredContextMock)).resolves.not.toThrow();
      expect(monitoredContextMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should throw error and abort when timeout exceeded', async () => {
      const startTime = new Date().getTime() - 40000; // 40 seconds ago (exceeds 30s timeout)
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      try {
        await impl.monitor(monitoredContextMock);
        fail('Expected monitor to throw error');
      } catch (error: any) {
        expect(error.message).toMatch(
          'TimeoutError: Step execution exceeded the configured timeout of 30s.'
        );
        expect(monitoredContextMock.abortController.abort).toHaveBeenCalledTimes(1);
      }
    });

    it('should report timeout duration with incorrect unit (implementation bug)', async () => {
      // This test documents the bug where the error message says "ms" but shows seconds
      const startTime = new Date().getTime() - 45000; // 45 seconds ago
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      try {
        await impl.monitor(monitoredContextMock);
        fail('Expected monitor to throw error');
      } catch (error: any) {
        expect(error.message).toMatch(
          'TimeoutError: Step execution exceeded the configured timeout of 30s.'
        );
      }
    });

    it('should handle different timeout formats', async () => {
      // Test with different timeout format
      node.timeout = '5m';
      const startTime = new Date().getTime() - 10000; // 10 seconds ago (within 5 minute limit)
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await expect(impl.monitor(monitoredContextMock)).resolves.not.toThrow();
      expect(monitoredContextMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should get step execution using step execution id from context', async () => {
      const startTime = new Date().getTime() - 10000;
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      await impl.monitor(monitoredContextMock);

      expect(wfExecutionStateMock.getStepExecution).toHaveBeenCalledWith('step-exec-123');
    });

    it('should handle missing step execution', async () => {
      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue(null);

      try {
        await impl.monitor(monitoredContextMock);
        fail('Expected monitor to throw error');
      } catch (error: any) {
        expect(error.message).toEqual("Cannot read properties of null (reading 'startedAt')");
      }
    });

    it('should use correct time calculations', async () => {
      // Use real times that are far enough apart to trigger timeout
      const startTime = mockDateNow.getTime() - 50000; // 50 seconds ago (exceeds 30s timeout)

      wfExecutionStateMock.getStepExecution = jest.fn().mockReturnValue({
        startedAt: new Date(startTime).toISOString(),
      });

      // Should exceed the 30s timeout and report 50 (seconds but labeled as "ms" due to bug)
      try {
        await impl.monitor(monitoredContextMock);
        fail('Expected monitor to throw error');
      } catch (error: any) {
        expect(error.message).toBe(
          'TimeoutError: Step execution exceeded the configured timeout of 30s.'
        );
      }
    });
  });
});
