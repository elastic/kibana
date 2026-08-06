/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '@kbn/workflows-execution-engine/server/mocks';
import { getChildWorkflowExecutions } from './get_child_workflow_executions';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';

describe('getChildWorkflowExecutions', () => {
  let mockWorkflowDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let mockStepDataClient: jest.Mocked<StepExecutionsDataClient>;

  const mockWorkflowGetByIds = (documents: unknown[]) =>
    createMockGetExecutionsByIdsResponse(documents as unknown as EsWorkflowExecution[]);

  const mockStepGetByIds = (documents: unknown[]) =>
    createMockGetExecutionsByIdsResponse(documents as unknown as EsWorkflowStepExecution[], {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

  const baseParams = {
    parentExecutionId: 'parent-exec-1',
    spaceId: 'default',
  };

  const parentDoc = {
    spaceId: 'default',
    stepExecutionIds: ['step-1', 'step-2'],
  };

  const createWorkflowExecuteStep = (
    id: string,
    childExecutionId: string,
    status = 'completed'
  ) => ({
    id,
    stepId: `step-${id}`,
    stepType: 'workflow.execute',
    status,
    workflowRunId: 'parent-exec-1',
    state: { executionId: childExecutionId },
    scopeStack: [],
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    topologicalIndex: 0,
    startedAt: '2024-01-01T00:00:00Z',
    workflowId: 'wf-1',
  });

  const createRegularStep = (id: string, status = 'completed') => ({
    id,
    stepId: `step-${id}`,
    stepType: 'action',
    status,
    workflowRunId: 'parent-exec-1',
    scopeStack: [],
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    topologicalIndex: 0,
    startedAt: '2024-01-01T00:00:00Z',
    workflowId: 'wf-1',
  });

  beforeEach(() => {
    mockWorkflowDataClient = createMockWorkflowDataClient();
    mockStepDataClient = createMockStepDataClient();
    jest.clearAllMocks();
  });

  it('should return empty array when parent execution is not found', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(mockWorkflowGetByIds([]));

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when spaceId does not match', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(
      mockWorkflowGetByIds([{ ...parentDoc, spaceId: 'other-space' }])
    );

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when no workflow.execute steps exist', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(mockWorkflowGetByIds([parentDoc]));
    mockStepDataClient.getByIds.mockResolvedValue(
      mockStepGetByIds([createRegularStep('step-1'), createRegularStep('step-2')])
    );

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toEqual([]);
    expect(mockStepDataClient.getByIds).toHaveBeenCalledTimes(1);
  });

  it('should skip workflow.execute steps that are not in terminal status', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(mockWorkflowGetByIds([parentDoc]));
    mockStepDataClient.getByIds.mockResolvedValue(
      mockStepGetByIds([createWorkflowExecuteStep('step-1', 'child-exec-1', 'running')])
    );

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toEqual([]);
  });

  it('should fetch child executions and their steps', async () => {
    mockWorkflowDataClient.getByIds
      .mockResolvedValueOnce(mockWorkflowGetByIds([parentDoc]))
      .mockResolvedValueOnce(
        mockWorkflowGetByIds([
          {
            id: 'child-exec-1',
            spaceId: 'default',
            workflowId: 'child-wf-1',
            workflowDefinition: { name: 'Child Workflow' },
            status: 'completed',
            stepExecutionIds: ['child-step-1', 'child-step-2'],
          },
        ])
      );
    mockStepDataClient.getByIds
      .mockResolvedValueOnce(
        mockStepGetByIds([createWorkflowExecuteStep('step-1', 'child-exec-1')])
      )
      .mockResolvedValueOnce(
        mockStepGetByIds([
          {
            id: 'child-step-1',
            stepId: 'do_something',
            stepType: 'action',
            status: 'completed',
            workflowRunId: 'child-exec-1',
            spaceId: 'default',
            scopeStack: [],
            globalExecutionIndex: 0,
            stepExecutionIndex: 0,
            topologicalIndex: 0,
            startedAt: '2024-01-01T00:00:00Z',
            workflowId: 'child-wf-1',
          },
        ])
      );

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        parentStepExecutionId: 'step-1',
        workflowId: 'child-wf-1',
        workflowName: 'Child Workflow',
        executionId: 'child-exec-1',
        status: 'completed',
      })
    );
    expect(result[0].stepExecutions).toHaveLength(1);
    expect(result[0].stepExecutions[0].id).toBe('child-step-1');
  });

  it('should use sourceIncludes for parent and child workflow execution lookups', async () => {
    mockWorkflowDataClient.getByIds
      .mockResolvedValueOnce(mockWorkflowGetByIds([parentDoc]))
      .mockResolvedValueOnce(mockWorkflowGetByIds([]));
    mockStepDataClient.getByIds.mockResolvedValue(
      mockStepGetByIds([createWorkflowExecuteStep('step-1', 'child-exec-1')])
    );

    await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(mockWorkflowDataClient.getByIds).toHaveBeenNthCalledWith(1, ['parent-exec-1'], {
      sourceIncludes: ['spaceId', 'stepExecutionIds'],
    });
    expect(mockWorkflowDataClient.getByIds).toHaveBeenNthCalledWith(2, ['child-exec-1'], {
      sourceIncludes: expect.arrayContaining([
        'id',
        'spaceId',
        'workflowId',
        'status',
        'stepExecutionIds',
      ]),
    });
  });

  it('should filter out child executions from a different space', async () => {
    mockWorkflowDataClient.getByIds
      .mockResolvedValueOnce(mockWorkflowGetByIds([parentDoc]))
      .mockResolvedValueOnce(
        mockWorkflowGetByIds([
          {
            id: 'child-exec-1',
            spaceId: 'other-space',
            workflowId: 'child-wf-1',
            status: 'completed',
            stepExecutionIds: [],
          },
        ])
      );
    mockStepDataClient.getByIds.mockResolvedValue(
      mockStepGetByIds([createWorkflowExecuteStep('step-1', 'child-exec-1')])
    );

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
    });

    expect(result).toEqual([]);
  });
});
