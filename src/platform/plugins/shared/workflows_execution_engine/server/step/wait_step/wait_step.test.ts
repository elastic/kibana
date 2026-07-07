/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitStep } from '@kbn/workflows';
import type { WaitGraphNode } from '@kbn/workflows/graph';
import { WaitStepImpl } from './wait_step';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

describe('WaitStepImpl', () => {
  let underTest: WaitStepImpl;

  let node: WaitGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    node = {
      id: 'wait-step',
      type: 'wait',
      stepId: 'wait-step',
      stepType: 'wait',
      configuration: {
        with: {
          duration: '1s', // 1 second
        },
      } as WaitStep,
    };

    mockStepExecutionRuntime = {
      tryEnterDelay: jest.fn().mockReturnValue(true),
      finishStep: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    underTest = new WaitStepImpl(
      node,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      workflowLogger
    );
  });

  describe('entering delay', () => {
    it('should call tryEnterDelay with duration', async () => {
      node.configuration.with.duration = '5s';
      await underTest.run();
      expect(mockStepExecutionRuntime.tryEnterDelay).toHaveBeenCalledWith('5s');
    });

    it('should log start message when entering delay', async () => {
      node.configuration.with.duration = '3s';
      mockStepExecutionRuntime.tryEnterDelay.mockReturnValue(true);

      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith('Waiting for 3s in step wait-step');
    });

    it('should not finish step or navigate when entering delay', async () => {
      node.configuration.with.duration = '10s';
      mockStepExecutionRuntime.tryEnterDelay.mockReturnValue(true);

      await underTest.run();

      expect(mockStepExecutionRuntime.finishStep).not.toHaveBeenCalled();
      expect(mockWorkflowRuntime.navigateToNextNode).not.toHaveBeenCalled();
    });
  });

  describe('exiting delay', () => {
    beforeEach(() => {
      mockStepExecutionRuntime.tryEnterDelay.mockReturnValue(false);
    });

    it('should finish step when exiting delay', async () => {
      node.configuration.with.duration = '5s';

      await underTest.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
    });

    it('should log finish message when exiting delay', async () => {
      node.configuration.with.duration = '2m';

      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        'Finished waiting for 2m in step wait-step'
      );
    });

    it('should navigate to next node when exiting delay', async () => {
      node.configuration.with.duration = '1s';

      await underTest.run();

      expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });

    it('should finish step before navigating', async () => {
      node.configuration.with.duration = '1s';
      const callOrder: string[] = [];

      mockStepExecutionRuntime.finishStep.mockImplementation(async () => {
        callOrder.push('finishStep');
      });
      mockWorkflowRuntime.navigateToNextNode.mockImplementation(() => {
        callOrder.push('navigateToNextNode');
      });

      await underTest.run();

      expect(callOrder).toEqual(['finishStep', 'navigateToNextNode']);
    });
  });
});
