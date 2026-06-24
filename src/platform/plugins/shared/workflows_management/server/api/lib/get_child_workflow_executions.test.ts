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

const WORKFLOW_BACKING_INDEX = '.ds-.workflows-executions-2026.06.22-000001';
const STEP_BACKING_INDEX = '.ds-.workflows-step-executions-2026.06.22-000001';

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
    _id: id,
    _index: STEP_BACKING_INDEX,
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
    _id: id,
    _index: STEP_BACKING_INDEX,
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

  const createWorkflowExecutionHit = (id: string, source: Record<string, unknown>) => ({
    found: true,
    _id: id,
    _index: WORKFLOW_BACKING_INDEX,
    _source: source,
  });

  beforeEach(() => {
    mockEsClient = {
      mget: jest.fn(),
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      indices: {
        getDataStream: jest.fn().mockImplementation(({ name }: { name: string }) => ({
          data_streams: [
            {
              indices: [
                {
                  index_name: name.includes('steps') ? STEP_BACKING_INDEX : WORKFLOW_BACKING_INDEX,
                },
              ],
            },
          ],
        })),
      },
    } as any;
    jest.clearAllMocks();
  });

  it('returns empty array when parent execution is not found', async () => {
    mockEsClient.mget.mockResolvedValueOnce({ docs: [{ found: false }] } as any);

    await expect(
      getChildWorkflowExecutions({
        ...baseParams,
        esClient: mockEsClient,
      })
    ).resolves.toEqual([]);
  });

  it('returns empty array when spaceId does not match', async () => {
    mockEsClient.mget.mockResolvedValueOnce({
      docs: [createWorkflowExecutionHit('parent-exec-1', { ...parentDoc, spaceId: 'other-space' })],
    } as any);

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('returns empty array when no workflow.execute steps exist', async () => {
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecutionHit('parent-exec-1', parentDoc)],
      } as any)
      .mockResolvedValueOnce({
        docs: [createRegularStep('step-1'), createRegularStep('step-2')],
      } as any);

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('skips workflow.execute steps that are not terminal', async () => {
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecutionHit('parent-exec-1', parentDoc)],
      } as any)
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1', 'running')],
      } as any);

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('fetches child executions and their steps through data stream mget helpers', async () => {
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecutionHit('parent-exec-1', parentDoc)],
      } as any)
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1')],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          createWorkflowExecutionHit('child-exec-1', {
            id: 'child-exec-1',
            spaceId: 'default',
            workflowId: 'child-wf-1',
            workflowDefinition: { name: 'Child Workflow' },
            status: 'completed',
            stepExecutionIds: ['child-step-1', 'child-step-2'],
          }),
        ],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          {
            found: true,
            _id: 'child-step-1',
            _index: STEP_BACKING_INDEX,
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
    expect(mockEsClient.mget).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        docs: [{ _index: WORKFLOW_BACKING_INDEX, _id: 'parent-exec-1' }],
        _source_includes: ['spaceId', 'stepExecutionIds'],
      })
    );
    expect(mockEsClient.mget).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        docs: [
          { _index: STEP_BACKING_INDEX, _id: 'step-1' },
          { _index: STEP_BACKING_INDEX, _id: 'step-2' },
        ],
        _source_excludes: ['input', 'output'],
      })
    );
  });

  it('falls back to workflowRunId search for child docs without stepExecutionIds', async () => {
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecutionHit('parent-exec-1', parentDoc)],
      } as any)
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1')],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          createWorkflowExecutionHit('child-exec-1', {
            id: 'child-exec-1',
            spaceId: 'default',
            workflowId: 'child-wf-1',
            workflowDefinition: { name: 'Child Workflow' },
            status: 'completed',
          }),
        ],
      } as any);
    mockEsClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any).mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              id: 'child-step-1',
              stepId: 'do_something',
              status: 'completed',
              workflowRunId: 'child-exec-1',
              spaceId: 'default',
            },
          },
        ],
      },
    } as any);

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result[0].stepExecutions).toHaveLength(1);
    expect(mockEsClient.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        index: '.workflows-steps',
        query: { match: { workflowRunId: 'child-exec-1' } },
      })
    );
  });

  it('filters out child executions from a different space', async () => {
    mockEsClient.mget
      .mockResolvedValueOnce({
        docs: [createWorkflowExecutionHit('parent-exec-1', parentDoc)],
      } as any)
      .mockResolvedValueOnce({
        docs: [createWorkflowExecuteStep('step-1', 'child-exec-1')],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          createWorkflowExecutionHit('child-exec-1', {
            spaceId: 'other-space',
            workflowId: 'child-wf-1',
            status: 'completed',
            stepExecutionIds: [],
          }),
        ],
      } as any);

    const result = await getChildWorkflowExecutions({
      ...baseParams,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });
});
