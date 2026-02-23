/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';

import { executionFlowLoop } from './execution_flow_loop';
import * as runNodeModule from './run_node';
import type { WorkflowExecutionLoopParams } from './types';
import type { CancellableNode, NodeImplementation } from '../step/node_implementation';
import { createMockWorkflowEventLogger } from '../workflow_event_logger/mocks';

jest.mock('./run_node');
const mockRunNode = runNodeModule.runNode as jest.Mock;

describe('executionFlowLoop', () => {
  let mockParams: WorkflowExecutionLoopParams;
  let statusSequence: ExecutionStatus[];

  beforeEach(() => {
    jest.clearAllMocks();
    statusSequence = [];

    mockRunNode.mockImplementation(async () => {
      // Simulate runNode transitioning status away from RUNNING
      statusSequence.shift();
    });

    mockParams = {
      workflowRuntime: {
        getWorkflowExecutionStatus: jest.fn(() => statusSequence[0] ?? ExecutionStatus.COMPLETED),
        getCurrentNode: jest.fn().mockReturnValue(null),
        getCurrentNodeScope: jest.fn().mockReturnValue([]),
      },
      stepExecutionRuntimeFactory: {
        createStepExecutionRuntime: jest.fn(),
      },
      nodesFactory: {
        create: jest.fn(),
      },
      workflowLogger: createMockWorkflowEventLogger(),
    } as unknown as WorkflowExecutionLoopParams;
  });

  it('should run nodes while status is RUNNING', async () => {
    statusSequence = [ExecutionStatus.RUNNING, ExecutionStatus.RUNNING, ExecutionStatus.COMPLETED];

    await executionFlowLoop(mockParams);

    expect(mockRunNode).toHaveBeenCalledTimes(2);
  });

  it('should not enter loop when status is already COMPLETED', async () => {
    statusSequence = [ExecutionStatus.COMPLETED];

    await executionFlowLoop(mockParams);

    expect(mockRunNode).not.toHaveBeenCalled();
  });

  describe('onCancel for cancelled waiting steps', () => {
    const mockNode = {
      id: 'waiting-node',
      stepId: 'workflow-execute-step',
      stepType: 'workflow.execute',
    } as GraphNodeUnion;

    it('should call onCancel when loop never enters and status is CANCELLED', async () => {
      statusSequence = [ExecutionStatus.CANCELLED];
      const mockOnCancel = jest.fn().mockResolvedValue(undefined);
      const cancellableNode: NodeImplementation & CancellableNode = {
        run: jest.fn(),
        onCancel: mockOnCancel,
      };

      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(mockNode);
      const mockStepRuntime = { node: mockNode };
      (
        mockParams.stepExecutionRuntimeFactory.createStepExecutionRuntime as jest.Mock
      ).mockReturnValue(mockStepRuntime);
      (mockParams.nodesFactory.create as jest.Mock).mockReturnValue(cancellableNode);

      await executionFlowLoop(mockParams);

      expect(mockRunNode).not.toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(cancellableNode.run).not.toHaveBeenCalled();
    });

    it('should not call onCancel when loop ran and status is CANCELLED', async () => {
      statusSequence = [ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED];
      const mockOnCancel = jest.fn();
      const cancellableNode: NodeImplementation & CancellableNode = {
        run: jest.fn(),
        onCancel: mockOnCancel,
      };

      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(mockNode);
      (mockParams.nodesFactory.create as jest.Mock).mockReturnValue(cancellableNode);

      await executionFlowLoop(mockParams);

      expect(mockRunNode).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not call onCancel for non-CancellableNode', async () => {
      statusSequence = [ExecutionStatus.CANCELLED];
      const regularNode: NodeImplementation = { run: jest.fn() };

      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(mockNode);
      const mockStepRuntime = { node: mockNode };
      (
        mockParams.stepExecutionRuntimeFactory.createStepExecutionRuntime as jest.Mock
      ).mockReturnValue(mockStepRuntime);
      (mockParams.nodesFactory.create as jest.Mock).mockReturnValue(regularNode);

      await executionFlowLoop(mockParams);

      expect(mockRunNode).not.toHaveBeenCalled();
    });

    it('should skip when there is no current node', async () => {
      statusSequence = [ExecutionStatus.CANCELLED];
      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(null);

      await executionFlowLoop(mockParams);

      expect(mockParams.nodesFactory.create).not.toHaveBeenCalled();
    });

    it('should handle onCancel errors gracefully', async () => {
      statusSequence = [ExecutionStatus.CANCELLED];
      const onCancelError = new Error('cleanup failed');
      const cancellableNode: NodeImplementation & CancellableNode = {
        run: jest.fn(),
        onCancel: jest.fn().mockRejectedValue(onCancelError),
      };

      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(mockNode);
      const mockStepRuntime = { node: mockNode };
      (
        mockParams.stepExecutionRuntimeFactory.createStepExecutionRuntime as jest.Mock
      ).mockReturnValue(mockStepRuntime);
      (mockParams.nodesFactory.create as jest.Mock).mockReturnValue(cancellableNode);

      await executionFlowLoop(mockParams);

      expect(mockParams.workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to execute onCancel hook - continuing cancellation',
        onCancelError
      );
    });
  });
});
