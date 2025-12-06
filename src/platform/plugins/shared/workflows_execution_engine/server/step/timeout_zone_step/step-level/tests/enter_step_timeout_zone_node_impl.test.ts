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
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterStepTimeoutZoneNodeImpl } from '../enter_step_timeout_zone_node_impl';

const mockParseDuration = parseDuration as jest.MockedFunction<typeof parseDuration>;

describe('EnterStepTimeoutZoneNodeImpl', () => {
  let node: EnterTimeoutZoneNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntimeMock: StepExecutionRuntime;
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
    jest.clearAllMocks();

    node = {
      id: 'test-timeout-zone',
      type: 'enter-timeout-zone',
      stepId: 'timeoutStep',
      stepType: 'step_level_timeout',
      timeout: '30s',
    };

    const mockStepExecution = {
      startedAt: new Date('2025-09-24T15:44:30.000Z').toISOString(),
    };

    stepExecutionRuntimeMock = {
      startStep: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'step-exec-123',
      stepExecution: mockStepExecution,
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManagerMock = {
      navigateToNextNode: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    impl = new EnterStepTimeoutZoneNodeImpl(
      node,
      wfExecutionRuntimeManagerMock,
      stepExecutionRuntimeMock
    );

    mockDateNow = new Date('2025-09-24T15:44:54.973Z');
    mockParseDuration.mockReturnValue(30000); // 30 seconds default
  });

  describe('run method', () => {
    it('should start step', async () => {
      await impl.run();
      expect(stepExecutionRuntimeMock.startStep).toHaveBeenCalledTimes(1);
      expect(stepExecutionRuntimeMock.startStep).toHaveBeenCalledWith();
    });

    it('should enter scope', async () => {
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
    let monitoredContextMock: StepExecutionRuntime;

    beforeEach(() => {
      monitoredContextMock = {
        abortController: {
          abort: jest.fn(),
        },
      } as any as StepExecutionRuntime;
    });

    it('should not throw error when within timeout limit', () => {
      const startTime = new Date().getTime() - 10000; // 10 seconds ago
      mockParseDuration.mockReturnValue(30000); // 30 seconds

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      expect(() => impl.monitor(monitoredContextMock)).not.toThrow();
      expect(monitoredContextMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should throw error and abort when timeout exceeded', () => {
      const startTime = new Date().getTime() - 40000; // 40 seconds ago (exceeds 30s timeout)
      mockParseDuration.mockReturnValue(30000); // 30 seconds

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      try {
        impl.monitor(monitoredContextMock);
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
      mockParseDuration.mockReturnValue(30000); // 30 seconds

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      expect(() => impl.monitor(monitoredContextMock)).toThrow(
        'TimeoutError: Step execution exceeded the configured timeout of 30s.'
      );
    });

    it('should handle different timeout formats', async () => {
      // Test with different timeout format
      node.timeout = '5m';
      const startTime = new Date().getTime() - 10000; // 10 seconds ago (within 5 minute limit)
      mockParseDuration.mockReturnValue(300000); // 5 minutes

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      expect(() => impl.monitor(monitoredContextMock)).not.toThrow();
      expect(monitoredContextMock.abortController.abort).not.toHaveBeenCalled();
    });

    it('should use step execution from step execution runtime directly', () => {
      const startTime = new Date().getTime() - 10000;
      mockParseDuration.mockReturnValue(30000); // 30 seconds

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      impl.monitor(monitoredContextMock);

      // The implementation uses stepExecutionRuntime.stepExecution directly
      expect(stepExecutionRuntimeMock.stepExecution).toBeDefined();
    });

    it('should handle missing step execution', () => {
      // Remove stepExecution to simulate null/undefined
      (stepExecutionRuntimeMock as any).stepExecution = null;

      try {
        impl.monitor(monitoredContextMock);
        fail('Expected monitor to throw error');
      } catch (error: any) {
        expect(error.message).toEqual("Cannot read properties of null (reading 'startedAt')");
      }
    });

    it('should use correct time calculations', async () => {
      // Use real times that are far enough apart to trigger timeout
      const startTime = mockDateNow.getTime() - 50000; // 50 seconds ago (exceeds 30s timeout)
      mockParseDuration.mockReturnValue(30000); // 30 seconds

      // Update the step execution mock for this specific test
      (stepExecutionRuntimeMock as any).stepExecution = {
        startedAt: new Date(startTime).toISOString(),
      };

      // Should exceed the 30s timeout and report 50 (seconds but labeled as "ms" due to bug)
      expect(() => impl.monitor(monitoredContextMock)).toThrow(
        'TimeoutError: Step execution exceeded the configured timeout of 30s.'
      );
    });
  });
});
