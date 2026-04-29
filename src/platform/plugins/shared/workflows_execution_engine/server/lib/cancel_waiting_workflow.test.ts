/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { cancelWaitingWorkflow } from './cancel_waiting_workflow';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

describe('cancelWaitingWorkflow', () => {
  let workflowExecutionRepository: jest.Mocked<
    Pick<WorkflowExecutionRepository, 'updateWorkflowExecution'>
  >;
  let stepExecutionRepository: jest.Mocked<
    Pick<StepExecutionRepository, 'getStepExecutionsByIds' | 'bulkUpsert'>
  >;

  const makeWorkflow = (overrides?: Partial<EsWorkflowExecution>): EsWorkflowExecution =>
    ({
      id: 'wf-exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutionIds: ['step-1', 'step-2'],
      ...overrides,
    } as EsWorkflowExecution);

  const makeStep = (overrides?: Partial<EsWorkflowStepExecution>): EsWorkflowStepExecution =>
    ({
      id: 'step-1',
      stepId: 'ask',
      stepType: 'waitForInput',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      ...overrides,
    } as EsWorkflowStepExecution);

  beforeEach(() => {
    workflowExecutionRepository = {
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    stepExecutionRepository = {
      getStepExecutionsByIds: jest.fn().mockResolvedValue([]),
      bulkUpsert: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should cancel the workflow execution', async () => {
    const workflow = makeWorkflow();
    stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([]);

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wf-exec-1',
        status: ExecutionStatus.CANCELLED,
        cancelRequested: true,
        cancellationReason: 'Cancelled by user',
      })
    );
  });

  it('should cancel WAITING_FOR_INPUT step executions', async () => {
    const workflow = makeWorkflow();
    const waitingStep = makeStep({ id: 'step-1', status: ExecutionStatus.WAITING_FOR_INPUT });
    const completedStep = makeStep({ id: 'step-2', status: ExecutionStatus.COMPLETED });

    stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([waitingStep, completedStep]);

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
      { id: 'step-1', status: ExecutionStatus.CANCELLED },
    ]);
  });

  it('should not cancel non-WAITING_FOR_INPUT steps', async () => {
    const workflow = makeWorkflow();
    const completedStep = makeStep({ id: 'step-2', status: ExecutionStatus.COMPLETED });
    const runningStep = makeStep({ id: 'step-3', status: ExecutionStatus.RUNNING });

    stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([completedStep, runningStep]);

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
  });

  it('should skip step fetch when stepExecutionIds is empty', async () => {
    const workflow = makeWorkflow({ stepExecutionIds: [] });

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(stepExecutionRepository.bulkUpsert).not.toHaveBeenCalled();
    expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalled();
  });

  it('should skip step fetch when stepExecutionIds is undefined', async () => {
    const workflow = makeWorkflow({ stepExecutionIds: undefined });

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalled();
  });

  it('should handle multiple WAITING_FOR_INPUT steps', async () => {
    const workflow = makeWorkflow({ stepExecutionIds: ['s1', 's2', 's3'] });
    stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
      makeStep({ id: 's1', status: ExecutionStatus.WAITING_FOR_INPUT }),
      makeStep({ id: 's2', status: ExecutionStatus.COMPLETED }),
      makeStep({ id: 's3', status: ExecutionStatus.WAITING_FOR_INPUT }),
    ]);

    await cancelWaitingWorkflow({
      workflowExecution: workflow,
      workflowExecutionRepository: workflowExecutionRepository as any,
      stepExecutionRepository: stepExecutionRepository as any,
    });

    expect(stepExecutionRepository.bulkUpsert).toHaveBeenCalledWith([
      { id: 's1', status: ExecutionStatus.CANCELLED },
      { id: 's3', status: ExecutionStatus.CANCELLED },
    ]);
  });
});
