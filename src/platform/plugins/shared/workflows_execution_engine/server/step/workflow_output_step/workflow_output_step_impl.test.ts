/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowOutputStepImpl } from './workflow_output_step_impl';

const createRuntime = () => {
  const scopeStack = {
    isEmpty: jest.fn().mockReturnValue(true),
  };
  return {
    startStep: jest.fn(),
    flushEventLogs: jest.fn().mockResolvedValue(undefined),
    failStep: jest.fn(),
    finishStep: jest.fn(),
    stepExecutionExists: jest.fn(() => true),
    contextManager: {
      renderValueAccordingToContext: jest.fn((v) => v),
    },
    scopeStack,
  };
};

const createWorkflowRuntime = (outputs?: unknown[]) => ({
  getWorkflowExecution: jest.fn(() => ({
    workflowDefinition: { outputs },
  })),
  setWorkflowStatus: jest.fn(),
  setWorkflowOutputs: jest.fn(),
  setWorkflowCancelled: jest.fn(),
  setWorkflowError: jest.fn(),
});

describe('WorkflowOutputStepImpl', () => {
  it('completes workflow with outputs on completed status', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const stepExecutionRuntimeFactory = {
      createStepExecutionRuntime: jest.fn(),
    };
    const step = new WorkflowOutputStepImpl(
      { configuration: { status: 'completed', with: { answer: 42 } } } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      stepExecutionRuntimeFactory as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowOutputs).toHaveBeenCalledWith({ answer: 42 });
    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith({ answer: 42 });
    expect(workflowRuntime.setWorkflowStatus).toHaveBeenCalledWith(ExecutionStatus.COMPLETED);
  });

  it('marks workflow as cancelled and keeps explicit cancellation reason', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          name: 'output-step',
          status: 'cancelled',
          with: { reason: 'requested by user' },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowCancelled).toHaveBeenCalledWith('requested by user');
    expect(workflowRuntime.setWorkflowStatus).not.toHaveBeenCalledWith(ExecutionStatus.CANCELLED);
  });

  it('marks workflow as failed when status is failed', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          status: 'failed',
          with: { message: 'failed on purpose' },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(expect.any(Error));
    expect(workflowRuntime.setWorkflowStatus).toHaveBeenCalledWith(ExecutionStatus.FAILED);
  });

  it('falls back to completed status when no explicit status is provided', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          with: { result: 'ok' },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith({ result: 'ok' });
    expect(workflowRuntime.setWorkflowStatus).toHaveBeenCalledWith(ExecutionStatus.COMPLETED);
  });

  it('fails with validation error when outputs do not match schema', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime([
      { name: 'answer', type: 'string', required: true },
    ]);
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          status: 'completed',
          with: { answer: 42 },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(stepExecutionRuntime.failStep).toHaveBeenCalledWith(expect.any(Error));
    expect(workflowRuntime.setWorkflowStatus).toHaveBeenCalledWith(ExecutionStatus.FAILED);
    expect(workflowLogger.logError).toHaveBeenCalledWith(
      expect.stringContaining('Output validation failed'),
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('uses empty object when with is not provided (workflow.fail case)', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          status: 'failed',
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowOutputs).toHaveBeenCalledWith({});
    expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Workflow terminated with failed status' })
    );
  });

  it('completes ancestor steps when scope stack is non-empty', async () => {
    const ancestorRuntime = {
      stepExecutionExists: jest.fn().mockReturnValue(true),
      finishStep: jest.fn(),
    };
    const scopeStack = {
      isEmpty: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true),
      getCurrentScope: jest.fn().mockReturnValue({
        nodeId: 'ancestor-node',
        stepId: 'ancestor-step',
        nodeType: 'enter-foreach',
      }),
      exitScope: jest.fn().mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),
        stackFrames: [],
      }),
    };
    const stepExecutionRuntime = {
      ...createRuntime(),
      scopeStack,
    };
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const stepExecutionRuntimeFactory = {
      createStepExecutionRuntime: jest.fn().mockReturnValue(ancestorRuntime),
    };
    const step = new WorkflowOutputStepImpl(
      { configuration: { status: 'completed', with: { ok: true } } } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      stepExecutionRuntimeFactory as any
    );

    await step.run();

    expect(stepExecutionRuntimeFactory.createStepExecutionRuntime).toHaveBeenCalled();
    expect(ancestorRuntime.finishStep).toHaveBeenCalled();
  });

  it('handles catch block when run throws a non-Error', async () => {
    const stepExecutionRuntime = createRuntime();
    stepExecutionRuntime.contextManager.renderValueAccordingToContext.mockReturnValue({
      bad: 'value',
    });
    const workflowRuntime = createWorkflowRuntime();
    workflowRuntime.getWorkflowExecution.mockImplementation(() => {
      throw new Error('string error');
    });
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      { configuration: { status: 'completed', with: { x: 1 } } } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(stepExecutionRuntime.failStep).toHaveBeenCalledWith(expect.any(Error));
    expect(workflowRuntime.setWorkflowStatus).toHaveBeenCalledWith(ExecutionStatus.FAILED);
  });

  it('uses message from cancelled output as cancellation reason', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          status: 'cancelled',
          with: { message: 'cancelled via message' },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowCancelled).toHaveBeenCalledWith('cancelled via message');
  });

  it('uses default cancellation reason when no reason or message', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          name: 'myStep',
          status: 'cancelled',
          with: {},
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowCancelled).toHaveBeenCalledWith("Cancelled by step 'myStep'");
  });

  it('uses reason from failed output for error message', async () => {
    const stepExecutionRuntime = createRuntime();
    const workflowRuntime = createWorkflowRuntime();
    const workflowLogger = { logError: jest.fn(), logInfo: jest.fn() };
    const step = new WorkflowOutputStepImpl(
      {
        configuration: {
          status: 'failed',
          with: { reason: 'custom failure reason' },
        },
      } as any,
      stepExecutionRuntime as any,
      workflowRuntime as any,
      workflowLogger as any,
      { createStepExecutionRuntime: jest.fn() } as any
    );

    await step.run();

    expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'custom failure reason' })
    );
  });
});
