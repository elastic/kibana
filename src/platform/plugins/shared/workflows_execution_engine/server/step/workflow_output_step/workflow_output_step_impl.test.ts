/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowOutput } from '@kbn/workflows';
import type { WorkflowOutputGraphNode } from '@kbn/workflows/graph';
import { WorkflowOutputStepImpl } from './workflow_output_step_impl';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

describe('WorkflowOutputStepImpl', () => {
  let mockNode: WorkflowOutputGraphNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let mockWorkflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let impl: WorkflowOutputStepImpl;

  beforeEach(() => {
    mockNode = {
      id: 'test-node',
      type: 'workflow.output',
      stepId: 'emit_output',
      stepType: 'workflow.output',
      configuration: {
        name: 'emit_output',
        type: 'workflow.output',
        status: 'completed',
        with: { result: 'success', count: 42 },
      },
    } as WorkflowOutputGraphNode;

    mockStepExecutionRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn().mockResolvedValue(undefined),
      failStep: jest.fn(),
      flushEventLogs: jest.fn().mockResolvedValue(undefined),
      contextManager: {
        renderValueAccordingToContext: jest.fn((value) => value), // Default: return value as-is
      },
    } as any;

    mockWorkflowRuntime = {
      navigateToNode: jest.fn(),
      setWorkflowError: jest.fn(),
      setWorkflowStatus: jest.fn(),
      getWorkflowExecution: jest.fn().mockReturnValue({
        id: 'test-execution',
        workflowId: 'test-workflow',
        status: 'running',
        context: {},
        workflowDefinition: null,
        startedAt: new Date().toISOString(),
      }),
    } as any;

    mockWorkflowLogger = {
      logDebug: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn(),
    } as any;

    impl = new WorkflowOutputStepImpl(
      mockNode,
      mockStepExecutionRuntime,
      mockWorkflowRuntime,
      mockWorkflowLogger
    );
  });

  describe('basic execution', () => {
    it('should finish step execution', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledTimes(1);
    });

    it('should terminate workflow by setting status to completed', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.setWorkflowStatus).toHaveBeenCalledWith('completed');
    });

    it('should store output in workflow execution context', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      await impl.run();
      expect(mockExecution.context).toEqual(
        expect.objectContaining({
          output: { result: 'success', count: 42 },
        })
      );
    });

    it('should flush event logs', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.flushEventLogs).toHaveBeenCalled();
    });

    it('should store output in workflow context', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      await impl.run();

      // Output should be stored directly in context
      expect(mockExecution.context.output).toEqual({
        result: 'success',
        count: 42,
      });
    });

    it('should process template variables in output values', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          result: '{{ steps.process_data.output.processed_message }}',
          timestamp: '{{ steps.process_data.output.current_time }}',
        },
      };

      // Mock the template rendering to return resolved values
      mockStepExecutionRuntime.contextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue({
          result: 'processed message value',
          timestamp: '2024-01-01T00:00:00Z',
        });

      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();

      // Verify that renderValueAccordingToContext was called with type-preserving templates
      expect(
        mockStepExecutionRuntime.contextManager.renderValueAccordingToContext
      ).toHaveBeenCalledWith({
        result: '${{ steps.process_data.output.processed_message }}',
        timestamp: '${{ steps.process_data.output.current_time }}',
      });

      // Verify that the rendered values are stored in the context
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      expect(mockExecution.context.output).toEqual({
        result: 'processed message value',
        timestamp: '2024-01-01T00:00:00Z',
      });
    });

    it('should preserve types for numeric template expressions', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          count: '{{ steps.calculate.output.count }}',
          total: '{{ steps.calculate.output.total }}',
        },
      };

      // Mock to return actual numbers
      mockStepExecutionRuntime.contextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue({
          count: 42,
          total: 100,
        });

      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();

      // Verify templates were converted to type-preserving syntax
      expect(
        mockStepExecutionRuntime.contextManager.renderValueAccordingToContext
      ).toHaveBeenCalledWith({
        count: '${{ steps.calculate.output.count }}',
        total: '${{ steps.calculate.output.total }}',
      });

      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      expect(mockExecution.context.output).toEqual({
        count: 42,
        total: 100,
      });
      // Verify they are actual numbers, not strings
      expect(typeof mockExecution.context.output.count).toBe('number');
      expect(typeof mockExecution.context.output.total).toBe('number');
    });

    it('should NOT convert templates with literal text outside template expression', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          message: 'Result: {{ steps.calculate.output.count }}',
          status: '{{ steps.calculate.output.status }} completed',
        },
      };

      mockStepExecutionRuntime.contextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue({
          message: 'Result: 42',
          status: 'success completed',
        });

      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();

      // Verify templates were NOT converted (kept as regular {{ }} templates)
      expect(
        mockStepExecutionRuntime.contextManager.renderValueAccordingToContext
      ).toHaveBeenCalledWith({
        message: 'Result: {{ steps.calculate.output.count }}',
        status: '{{ steps.calculate.output.status }} completed',
      });
    });
  });

  describe('status handling', () => {
    it('should set workflow status to completed for completed status', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.setWorkflowStatus).toHaveBeenCalledWith('completed');
      expect(mockWorkflowRuntime.setWorkflowError).not.toHaveBeenCalled();
    });

    it('should set workflow status to cancelled for cancelled status', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        status: 'cancelled',
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockWorkflowRuntime.setWorkflowStatus).toHaveBeenCalledWith('cancelled');
      expect(mockWorkflowRuntime.setWorkflowError).not.toHaveBeenCalled();
    });

    it('should set workflow status to failed and call failStep with error when status is failed', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        status: 'failed',
        with: { message: 'Custom failure message' },
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockWorkflowRuntime.setWorkflowStatus).toHaveBeenCalledWith('failed');
      // failStep() is called with the error, which also sets the workflow error
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom failure message',
        })
      );
    });

    it('should use default error message when status is failed but no message provided', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        status: 'failed',
        with: { someOtherField: 'value' },
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockWorkflowRuntime.setWorkflowStatus).toHaveBeenCalledWith('failed');
      // failStep() is called with the error, which also sets the workflow error
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Workflow terminated with failed status',
        })
      );
    });
  });

  describe('output validation', () => {
    beforeEach(() => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      mockExecution.workflowDefinition = {
        name: 'test-workflow',
        version: '1',
        enabled: true,
        triggers: [],
        steps: [],
        outputs: [
          {
            name: 'result',
            type: 'string',
            required: true,
          },
          {
            name: 'count',
            type: 'number',
            required: true,
          },
        ] as WorkflowOutput[],
      };
    });

    it('should validate outputs against workflow schema when outputs are defined', async () => {
      await impl.run();
      // Should complete successfully with valid outputs
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(mockStepExecutionRuntime.failStep).not.toHaveBeenCalled();
    });

    it('should fail step when required output is missing', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          count: 42,
          // missing 'result'
        },
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalled();
      expect(mockWorkflowRuntime.setWorkflowError).toHaveBeenCalled();
    });

    it('should fail step when output has wrong type', async () => {
      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          result: 123, // should be string
          count: 42,
        },
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalled();
      expect(mockWorkflowRuntime.setWorkflowError).toHaveBeenCalled();
    });

    it('should skip validation when workflow has no outputs defined', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      mockExecution.workflowDefinition = {
        name: 'test-workflow',
        version: '1',
        enabled: true,
        triggers: [],
        steps: [],
        // no outputs
      };

      await impl.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(mockStepExecutionRuntime.failStep).not.toHaveBeenCalled();
    });

    it('should validate array outputs correctly', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      mockExecution.workflowDefinition = {
        name: 'test-workflow',
        version: '1',
        enabled: true,
        triggers: [],
        steps: [],
        outputs: [
          {
            name: 'processed_items',
            type: 'array',
            required: true,
          },
          {
            name: 'count',
            type: 'number',
            required: true,
          },
        ] as WorkflowOutput[],
      };

      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          processed_items: ['apple', 'banana', 'cherry'],
          count: 3,
        },
      };

      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(mockStepExecutionRuntime.failStep).not.toHaveBeenCalled();
    });

    it('should validate array outputs with template expressions', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      mockExecution.workflowDefinition = {
        name: 'test-workflow',
        version: '1',
        enabled: true,
        triggers: [],
        steps: [],
        outputs: [
          {
            name: 'processed_items',
            type: 'array',
            required: true,
          },
          {
            name: 'count',
            type: 'number',
            required: true,
          },
        ] as WorkflowOutput[],
      };

      mockNode.configuration = {
        ...mockNode.configuration,
        with: {
          processed_items: '{{ inputs.items }}',
          count: '{{ inputs.items.length }}',
        },
      };

      // Mock the template rendering to return actual array
      mockStepExecutionRuntime.contextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue({
          processed_items: ['apple', 'banana', 'cherry'],
          count: 3,
        });

      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
      expect(mockStepExecutionRuntime.failStep).not.toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log successful completion', async () => {
      await impl.run();
      expect(mockWorkflowLogger.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('Workflow outputs emitted successfully'),
        expect.any(Object)
      );
    });

    it('should log validation errors', async () => {
      const mockExecution = mockWorkflowRuntime.getWorkflowExecution();
      mockExecution.workflowDefinition = {
        name: 'test-workflow',
        version: '1',
        enabled: true,
        triggers: [],
        steps: [],
        outputs: [
          {
            name: 'required_field',
            type: 'string',
            required: true,
          },
        ] as WorkflowOutput[],
      };

      mockNode.configuration = {
        ...mockNode.configuration,
        with: {}, // missing required field
      };
      impl = new WorkflowOutputStepImpl(
        mockNode,
        mockStepExecutionRuntime,
        mockWorkflowRuntime,
        mockWorkflowLogger
      );

      await impl.run();
      expect(mockWorkflowLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('validation failed'),
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors during execution', async () => {
      // Throw error from getWorkflowExecution which is inside try-catch
      mockWorkflowRuntime.getWorkflowExecution = jest.fn().mockImplementation(() => {
        throw new Error('Failed to get workflow execution');
      });

      await impl.run();
      expect(mockStepExecutionRuntime.failStep).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to get workflow execution'),
        })
      );
    });

    it('should flush logs even when execution fails', async () => {
      // Throw error from getWorkflowExecution which is inside try-catch
      mockWorkflowRuntime.getWorkflowExecution = jest.fn().mockImplementation(() => {
        throw new Error('Failed to get workflow execution');
      });

      await impl.run();
      // Should flush logs twice: once after startStep, once in finally block
      expect(mockStepExecutionRuntime.flushEventLogs).toHaveBeenCalled();
    });
  });
});
