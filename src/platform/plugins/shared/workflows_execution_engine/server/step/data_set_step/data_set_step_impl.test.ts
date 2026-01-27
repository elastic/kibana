/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSetGraphNode } from '@kbn/workflows/graph';
import { DataSetStepImpl } from './data_set_step_impl';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

describe('DataSetStepImpl', () => {
  let dataSetStep: DataSetStepImpl;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let mockNode: DataSetGraphNode;

  let stepContextAbortController: AbortController;
  let mockContextManager: jest.Mocked<
    Pick<WorkflowContextManager, 'renderValueAccordingToContext'>
  > & {
    abortController: AbortController;
  };

  beforeEach(() => {
    stepContextAbortController = new AbortController();
    mockContextManager = {
      renderValueAccordingToContext: jest.fn(<T>(value: T): T => value),
      abortController: stepContextAbortController,
    } as any;

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn().mockResolvedValue(undefined),
      getCurrentStepState: jest.fn(),
      setCurrentStepState: jest.fn().mockResolvedValue(undefined),
      stepExecutionId: 'test-step-exec-id',
      abortController: stepContextAbortController,
      flushEventLogs: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    mockWorkflowLogger = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as any;

    mockNode = {
      id: 'test-data-set-step',
      type: 'data.set',
      stepId: 'test-data-set-step',
      stepType: 'data.set',
      configuration: {
        name: 'test-data-set-step',
        type: 'data.set',
        with: {
          user_id: '12345',
          email: 'user@example.com',
          is_active: true,
        },
      },
    };

    dataSetStep = new DataSetStepImpl(
      mockNode,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      mockWorkflowLogger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInput', () => {
    it('should render the with configuration', () => {
      const input = dataSetStep.getInput();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith({
        user_id: '12345',
        email: 'user@example.com',
        is_active: true,
      });
      expect(input).toEqual({
        user_id: '12345',
        email: 'user@example.com',
        is_active: true,
      });
    });

    it('should handle empty with configuration', () => {
      mockNode.configuration.with = {};
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      const input = dataSetStep.getInput();

      expect(input).toEqual({});
    });
  });

  describe('run', () => {
    it('should set variables and return them as output', async () => {
      await dataSetStep.run();

      // Variables are now stored as step output, not via setVariables
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        user_id: '12345',
        email: 'user@example.com',
        is_active: true,
      });
      expect(mockWorkflowLogger.logDebug).toHaveBeenCalledWith('Set 3 variable(s)');
    });

    it('should preserve string values', async () => {
      mockNode.configuration.with = {
        name: 'John Doe',
        message: 'Hello World',
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        name: 'John Doe',
        message: 'Hello World',
      });
    });

    it('should preserve number values', async () => {
      mockNode.configuration.with = {
        age: 25,
        count: 100,
        price: 99.99,
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        age: 25,
        count: 100,
        price: 99.99,
      });
    });

    it('should preserve boolean values', async () => {
      mockNode.configuration.with = {
        is_active: true,
        is_verified: false,
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        is_active: true,
        is_verified: false,
      });
    });

    it('should preserve nested objects', async () => {
      mockNode.configuration.with = {
        profile: {
          name: 'John Doe',
          age: 30,
          address: {
            city: 'San Francisco',
            country: 'USA',
          },
        },
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        profile: {
          name: 'John Doe',
          age: 30,
          address: {
            city: 'San Francisco',
            country: 'USA',
          },
        },
      });
    });

    it('should preserve arrays', async () => {
      mockNode.configuration.with = {
        tags: ['workflow', 'automation', 'data'],
        numbers: [1, 2, 3, 4, 5],
        mixed: ['string', 42, true, { key: 'value' }],
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        tags: ['workflow', 'automation', 'data'],
        numbers: [1, 2, 3, 4, 5],
        mixed: ['string', 42, true, { key: 'value' }],
      });
    });

    it('should handle empty object', async () => {
      mockNode.configuration.with = {};
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({});
      expect(mockWorkflowLogger.logDebug).toHaveBeenCalledWith('Set 0 variable(s)');
    });

    it('should handle null and undefined values', async () => {
      mockNode.configuration.with = {
        nullable: null,
        optional: undefined,
      };
      dataSetStep = new DataSetStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
        nullable: null,
        optional: undefined,
      });
    });

    it('should error when input is not an object', async () => {
      mockContextManager.renderValueAccordingToContext.mockReturnValue('not an object' as any);

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalled();
      expect(mockWorkflowLogger.logError).toHaveBeenCalledWith(
        'Failed to set variables: invalid input type',
        expect.any(Error)
      );
    });

    it('should error when input is an array', async () => {
      mockContextManager.renderValueAccordingToContext.mockReturnValue([1, 2, 3] as any);

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalled();
      expect(mockWorkflowLogger.logError).toHaveBeenCalledWith(
        'Failed to set variables: invalid input type',
        expect.any(Error)
      );
    });

    it('should error when input is null', async () => {
      mockContextManager.renderValueAccordingToContext.mockReturnValue(null as any);

      await dataSetStep.run();

      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalled();
    });
  });
});
