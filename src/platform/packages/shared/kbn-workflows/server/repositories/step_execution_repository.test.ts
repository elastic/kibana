/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getStepExecutionsByIds,
  getStepExecutionsByWorkflowExecution,
} from './step_execution_repository';
import type { EsWorkflowStepExecution } from '../../types/v1';

const INDEX = '.workflows-step-executions';

const createStepExecution = (
  overrides: Partial<EsWorkflowStepExecution> = {}
): EsWorkflowStepExecution =>
  ({
    id: 'step-1',
    stepId: 'test-step',
    workflowRunId: 'exec-1',
    status: 'completed',
    startedAt: '2025-01-01T00:00:00Z',
    globalExecutionIndex: 0,
    ...overrides,
  } as EsWorkflowStepExecution);

describe('getStepExecutionsByIds', () => {
  let esClient: { mget: jest.Mock };

  beforeEach(() => {
    esClient = { mget: jest.fn() };
  });

  it('should return empty array for empty stepExecutionIds', async () => {
    const result = await getStepExecutionsByIds(esClient as any, INDEX, []);

    expect(result).toEqual([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('should fetch step executions using mget', async () => {
    const step1 = createStepExecution({ id: 'step-1' });
    const step2 = createStepExecution({ id: 'step-2', stepId: 'test-step-2' });

    esClient.mget.mockResolvedValue({
      docs: [
        { found: true, _id: 'step-1', _source: step1 },
        { found: true, _id: 'step-2', _source: step2 },
      ],
    });

    const result = await getStepExecutionsByIds(esClient as any, INDEX, ['step-1', 'step-2']);

    expect(result).toEqual([step1, step2]);
    expect(esClient.mget).toHaveBeenCalledWith({
      index: INDEX,
      ids: ['step-1', 'step-2'],
    });
  });

  it('should skip documents that are not found', async () => {
    const step1 = createStepExecution({ id: 'step-1' });

    esClient.mget.mockResolvedValue({
      docs: [
        { found: true, _id: 'step-1', _source: step1 },
        { found: false, _id: 'step-2' },
      ],
    });

    const result = await getStepExecutionsByIds(esClient as any, INDEX, ['step-1', 'step-2']);

    expect(result).toEqual([step1]);
  });

  it('should skip documents with missing _source', async () => {
    esClient.mget.mockResolvedValue({
      docs: [{ found: true, _id: 'step-1', _source: null }],
    });

    const result = await getStepExecutionsByIds(esClient as any, INDEX, ['step-1']);

    expect(result).toEqual([]);
  });

  it('should pass sourceExcludes when provided', async () => {
    esClient.mget.mockResolvedValue({ docs: [] });

    await getStepExecutionsByIds(esClient as any, INDEX, ['step-1'], ['input', 'output']);

    expect(esClient.mget).toHaveBeenCalledWith({
      index: INDEX,
      ids: ['step-1'],
      _source_excludes: ['input', 'output'],
    });
  });

  it('should not pass _source_excludes when sourceExcludes is empty', async () => {
    esClient.mget.mockResolvedValue({ docs: [] });

    await getStepExecutionsByIds(esClient as any, INDEX, ['step-1'], []);

    expect(esClient.mget).toHaveBeenCalledWith({
      index: INDEX,
      ids: ['step-1'],
    });
  });
});

describe('getStepExecutionsByWorkflowExecution', () => {
  let esClient: { mget: jest.Mock; search: jest.Mock };

  beforeEach(() => {
    esClient = { mget: jest.fn(), search: jest.fn() };
  });

  it('should use mget when stepExecutionIds are provided', async () => {
    const step1 = createStepExecution({ id: 'step-1' });

    esClient.mget.mockResolvedValue({
      docs: [{ found: true, _id: 'step-1', _source: step1 }],
    });

    const result = await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['step-1'],
    });

    expect(result).toEqual([step1]);
    expect(esClient.mget).toHaveBeenCalled();
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('should pass sourceExcludes to mget when stepExecutionIds are provided', async () => {
    esClient.mget.mockResolvedValue({ docs: [] });

    await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: ['step-1'],
      sourceExcludes: ['input'],
    });

    expect(esClient.mget).toHaveBeenCalledWith(
      expect.objectContaining({ _source_excludes: ['input'] })
    );
  });

  it('should fall back to search when stepExecutionIds is undefined', async () => {
    const step1 = createStepExecution({ id: 'step-1' });

    esClient.search.mockResolvedValue({
      hits: { hits: [{ _id: 'step-1', _source: step1 }] },
    });

    const result = await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
    });

    expect(result).toEqual([step1]);
    expect(esClient.search).toHaveBeenCalledWith({
      index: INDEX,
      query: { match: { workflowRunId: 'exec-1' } },
      sort: 'startedAt:desc',
      size: 10000,
    });
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('should fall back to search when stepExecutionIds is empty', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } });

    await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
      stepExecutionIds: [],
    });

    expect(esClient.search).toHaveBeenCalled();
    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('should pass sourceExcludes to search fallback', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } });

    await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
      sourceExcludes: ['input', 'output'],
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: { excludes: ['input', 'output'] },
      })
    );
  });

  it('should not pass _source when sourceExcludes is empty on search fallback', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } });

    await getStepExecutionsByWorkflowExecution({
      esClient: esClient as any,
      stepsExecutionIndex: INDEX,
      workflowExecutionId: 'exec-1',
      sourceExcludes: [],
    });

    const searchCall = esClient.search.mock.calls[0][0];
    expect(searchCall).not.toHaveProperty('_source');
  });
});
