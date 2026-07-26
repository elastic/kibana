/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getChildWorkflowExecutions } from './get_child_workflow_executions';

describe('getChildWorkflowExecutions', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  const baseParams = {
    workflowExecutionIndex: '.workflows-executions',
    stepsExecutionIndex: '.workflows-steps',
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
    found: true,
    _source: {
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
    },
  });

  const createRegularStep = (id: string, status = 'completed') => ({
    found: true,
    _source: {
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
    },
  });

  beforeEach(() => {
    mockEsClient = {
      get: jest.fn(),
      mget: jest.fn(),
      search: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  it('should throw when parent execution is not found (404)', async () => {
    const notFoundError = new Error('Not found');
    Object.assign(notFoundError, { meta: { statusCode: 404 } });
    mockEsClient.get.mockRejectedValue(notFoundError);

    await expect(
      getChildWorkflowExecutions({
        ...baseParams,
        esClient: mockEsClient,
      })
    ).rejects.toThrow('Not found');
  });

  it('should return empty array when spaceId does not match', async () => {
    mockEsClient.get.mockResolvedValue({
      _source: { ...parentDoc, spaceId: 'other-space' },
    } as any);
    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when no workflow.execute steps exist', async () => {
    mockEsClient.get.mockResolvedValue({ _source: parentDoc } as any);
    mockEsClient.mget.mockResolvedValue({
      docs: [createRegularStep('step-1'), createRegularStep('step-2')],
    } as any);
    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
    expect(mockEsClient.mget).toHaveBeenCalledTimes(1);
  });

  it('should skip workflow.execute steps that are not in terminal status', async () => {
    mockEsClient.get.mockResolvedValue({ _source: parentDoc } as any);
    mockEsClient.mget.mockResolvedValue({
      docs: [createWorkflowExecuteStep('step-1', 'child-exec-1', 'running')],
    } as any);
    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('should fetch child executions and their steps', async () => {
    mockEsClient.get.mockResolvedValue({ _source: parentDoc } as any);
    // Parent step executions (mget #1)
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1')],
      } as any) // Child execution docs (mget #2)
      .mockResolvedValueOnce({
        docs: [
          {
            _id: 'child-exec-1',
            found: true,
            _source: {
              spaceId: 'default',
              workflowId: 'child-wf-1',
              workflowDefinition: { name: 'Child Workflow' },
              status: 'completed',
              stepExecutionIds: ['child-step-1', 'child-step-2'],
            },
          },
        ],
      } as any) // Child step executions (mget #3)
      .mockResolvedValueOnce({
        docs: [
          {
            found: true,
            _source: {
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
          },
        ],
      } as any);
    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
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

  it('should use _source_includes for parent GET and child mget', async () => {
    mockEsClient.get.mockResolvedValue({ _source: parentDoc } as any);
    mockEsClient.mget
      .mockResolvedValueOnce({ docs: [createRegularStep('step-1')] } as any)
      .mockResolvedValue({ docs: [] } as any);
    await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(mockEsClient.get).toHaveBeenCalledWith(
      expect.objectContaining({
        _source_includes: ['spaceId', 'stepExecutionIds'],
      })
    );
  });

  it('should filter out child executions from a different space', async () => {
    mockEsClient.get.mockResolvedValue({ _source: parentDoc } as any);
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1')],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            _id: 'child-exec-1',
            found: true,
            _source: {
              spaceId: 'other-space',
              workflowId: 'child-wf-1',
              status: 'completed',
              stepExecutionIds: [],
            },
          },
        ],
      } as any);
    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });
});
