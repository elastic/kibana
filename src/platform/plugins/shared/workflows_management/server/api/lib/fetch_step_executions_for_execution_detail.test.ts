/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionsDataClient } from '@kbn/workflows-execution-engine/server';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
} from '@kbn/workflows-execution-engine/server/mocks';
import { fetchStepExecutionsForExecutionDetail } from './fetch_step_executions_for_execution_detail';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';

const sizeExceededError = () =>
  new errors.RequestAbortedError(
    'The content length (9000) is bigger than the maximum allowed buffer (42)'
  );

const stepDoc = (id: string): EsWorkflowStepExecution =>
  ({
    id,
    stepId: id,
    status: 'completed',
    globalExecutionIndex: 0,
  } as EsWorkflowStepExecution);

describe('fetchStepExecutionsForExecutionDetail', () => {
  let mockStepDataClient: jest.Mocked<StepExecutionsDataClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockStepDataClient = createMockStepDataClient();
    mockLogger = loggerMock.create();
    jest.clearAllMocks();
  });

  it('batches getByIds and returns all steps when every batch succeeds', async () => {
    mockStepDataClient.getByIds
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      )
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('c')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      );

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b', 'c'],
      sourceExcludes: ['input', 'output'],
      batchSize: 2,
    });

    expect(mockStepDataClient.getByIds).toHaveBeenNthCalledWith(1, ['a', 'b'], {
      sourceExcludes: ['input', 'output'],
    });
    expect(mockStepDataClient.getByIds).toHaveBeenNthCalledWith(2, ['c'], {
      sourceExcludes: ['input', 'output'],
    });
    expect(result.stepExecutions.map((step) => step.id)).toEqual(['a', 'b', 'c']);
    expect(result.stepExecutionsTruncatedCount).toBeUndefined();
  });

  it('halves the batch size after a response-size abort and continues', async () => {
    mockStepDataClient.getByIds
      .mockRejectedValueOnce(sizeExceededError())
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      )
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('c'), stepDoc('d')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      );

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b', 'c', 'd'],
      batchSize: 4,
    });

    expect(mockStepDataClient.getByIds).toHaveBeenNthCalledWith(1, ['a', 'b', 'c', 'd'], {
      sourceExcludes: undefined,
    });
    expect(mockStepDataClient.getByIds).toHaveBeenNthCalledWith(2, ['a', 'b'], {
      sourceExcludes: undefined,
    });
    expect(result.stepExecutions).toHaveLength(4);
    expect(result.stepExecutionsTruncatedCount).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns empty steps with full truncatedCount when even a batch of 1 exceeds the size limit', async () => {
    mockStepDataClient.getByIds.mockRejectedValue(sizeExceededError());

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b'],
      batchSize: 1,
    });

    expect(result.stepExecutions).toEqual([]);
    expect(result.stepExecutionsTruncatedCount).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('stops and reports truncatedCount when a batch of 1 still exceeds the size limit', async () => {
    mockStepDataClient.getByIds
      .mockRejectedValueOnce(sizeExceededError())
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('a')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      )
      .mockRejectedValueOnce(sizeExceededError());

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b', 'c'],
      batchSize: 2,
    });

    expect(result.stepExecutions.map((step) => step.id)).toEqual(['a']);
    expect(result.stepExecutionsTruncatedCount).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('stops after the first batch when accumulated decoded size exceeds the budget', async () => {
    mockStepDataClient.getByIds
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      )
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([stepDoc('c'), stepDoc('d')], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      );

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b', 'c', 'd'],
      batchSize: 2,
      maxDecodedBytes: 1,
    });

    expect(mockStepDataClient.getByIds).toHaveBeenCalledTimes(1);
    expect(result.stepExecutions.map((step) => step.id)).toEqual(['a', 'b']);
    expect(result.stepExecutionsTruncatedCount).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('does not add a later batch that would exceed the decoded-size budget', async () => {
    const largeDoc = { ...stepDoc('a'), output: 'x'.repeat(200) } as EsWorkflowStepExecution;
    mockStepDataClient.getByIds
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse([largeDoc], {
          index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        })
      )
      .mockResolvedValueOnce(
        createMockGetExecutionsByIdsResponse(
          [{ ...stepDoc('b'), output: 'y'.repeat(200) } as EsWorkflowStepExecution],
          {
            index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
          }
        )
      );

    const firstBatchBytes = Buffer.byteLength(JSON.stringify([largeDoc]), 'utf8');

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['a', 'b'],
      batchSize: 1,
      maxDecodedBytes: firstBatchBytes + 10,
    });

    expect(result.stepExecutions.map((step) => step.id)).toEqual(['a']);
    expect(result.stepExecutionsTruncatedCount).toBe(1);
  });

  it('falls back to search when stepExecutionIds are missing', async () => {
    mockStepDataClient.search.mockResolvedValue({
      hits: { hits: [{ _source: stepDoc('legacy') }] },
    } as never);

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
      sourceExcludes: ['input', 'output'],
    });

    expect(mockStepDataClient.search).toHaveBeenCalled();
    expect(mockStepDataClient.getByIds).not.toHaveBeenCalled();
    expect(result.stepExecutions).toHaveLength(1);
    expect(result.stepExecutionsTruncatedCount).toBeUndefined();
  });

  it('returns empty steps without a count when search fallback hits a size abort', async () => {
    mockStepDataClient.search.mockRejectedValue(sizeExceededError());

    const result = await fetchStepExecutionsForExecutionDetail({
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'exec-1',
    });

    expect(result.stepExecutions).toEqual([]);
    expect(result.stepExecutionsTruncatedCount).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('rethrows unexpected errors', async () => {
    mockStepDataClient.getByIds.mockRejectedValue(new Error('boom'));

    await expect(
      fetchStepExecutionsForExecutionDetail({
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        workflowExecutionId: 'exec-1',
        stepExecutionIds: ['a'],
      })
    ).rejects.toThrow('boom');
  });
});
