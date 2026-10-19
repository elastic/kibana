/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { workflowsExecutionEngineMock } from '@kbn/workflows-execution-engine/server/mocks';
import { getExecutionStepExecutions } from './get_execution_step_executions';
import { WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE } from '../../lib/workflow_history_pagination_error';

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

describe('getExecutionStepExecutions', () => {
  let workflowsExecutionEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;

  const baseParams = {
    workflowExecutionId: 'exec-1',
    spaceId: 'default',
    page: 1,
    size: 100,
  };

  beforeEach(() => {
    workflowsExecutionEngine = workflowsExecutionEngineMock.createStart();
    workflowsExecutionEngine.getWorkflowExecutionsById.mockReset();
    workflowsExecutionEngine.getStepExecutionsByIds.mockReset();
    workflowsExecutionEngine.searchSteps.mockReset();
  });

  const load = (overrides: Partial<typeof baseParams> = {}) =>
    getExecutionStepExecutions({
      workflowsExecutionEngine,
      ...baseParams,
      ...overrides,
    });

  const mockParent = (stepExecutionIds?: string[], managed?: boolean) => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([
      { spaceId: 'default', managed, stepExecutionIds } as EsWorkflowExecution,
    ]);
  };

  it('loads a page of step ids and returns total from the id list', async () => {
    mockParent(['a', 'b', 'c']);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([stepDoc('a'), stepDoc('b')]);

    const result = await load({ size: 2 });

    expect(workflowsExecutionEngine.getWorkflowExecutionsById).toHaveBeenCalledWith({
      ids: ['exec-1'],
      spaceId: 'default',
      sourceIncludes: ['spaceId', 'managed', 'stepExecutionIds'],
    });
    expect(workflowsExecutionEngine.getStepExecutionsByIds).toHaveBeenCalledWith({
      ids: ['a', 'b'],
      spaceId: 'default',
      sourceExcludes: ['input', 'output'],
    });
    expect(result.workflowExecution.spaceId).toBe('default');
    expect(result.stepExecutionListResult.results.map((step) => step.id)).toEqual(['a', 'b']);
    expect(result.stepExecutionListResult.total).toBe(3);
    expect(result.stepExecutionListResult.page).toBe(1);
    expect(result.stepExecutionListResult.size).toBe(2);
  });

  it('slices the requested page of ids', async () => {
    mockParent(['a', 'b', 'c']);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([stepDoc('c')]);

    const result = await load({ page: 2, size: 2 });

    expect(workflowsExecutionEngine.getStepExecutionsByIds).toHaveBeenCalledWith({
      ids: ['c'],
      spaceId: 'default',
      sourceExcludes: ['input', 'output'],
    });
    expect(result.stepExecutionListResult.results.map((step) => step.id)).toEqual(['c']);
    expect(result.stepExecutionListResult.total).toBe(3);
  });

  it('does not load steps when the page is past the end of the id list', async () => {
    mockParent(['a']);

    const result = await load({ page: 2, size: 100 });

    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(result.stepExecutionListResult).toEqual({ results: [], total: 1, page: 2, size: 100 });
  });

  it('propagates a page load size error instead of returning a successful empty page', async () => {
    mockParent(['a', 'b']);
    const error = sizeExceededError();
    workflowsExecutionEngine.getStepExecutionsByIds.mockRejectedValue(error);

    await expect(load()).rejects.toBe(error);
  });

  it('preserves a successful empty page when step documents are missing', async () => {
    mockParent(['a', 'b']);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([]);

    const result = await load();

    expect(result.stepExecutionListResult).toEqual({ results: [], total: 2, page: 1, size: 100 });
  });

  it('throws WorkflowHistoryPaginationError when legacy from plus size exceeds the result window', async () => {
    mockParent(undefined);

    await expect(load({ page: 3, size: 5000 })).rejects.toThrow(
      WORKFLOW_EXECUTION_STEPS_PAGINATION_EXCEEDED_MESSAGE
    );

    expect(workflowsExecutionEngine.searchSteps).not.toHaveBeenCalled();
  });

  it('does not throw for id-list paging past the Elasticsearch result window', async () => {
    mockParent(['a']);

    const result = await load({ page: 3, size: 5000 });

    expect(workflowsExecutionEngine.searchSteps).not.toHaveBeenCalled();
    expect(result.stepExecutionListResult).toEqual({
      results: [],
      total: 1,
      page: 3,
      size: 5000,
    });
  });

  it('falls back to search when stepExecutionIds are missing', async () => {
    mockParent(undefined);
    workflowsExecutionEngine.searchSteps.mockResolvedValue({
      results: [stepDoc('legacy')],
      total: 1,
      page: 1,
      size: 100,
    });

    const result = await load();

    expect(workflowsExecutionEngine.searchSteps).toHaveBeenCalledWith({
      executionId: 'exec-1',
      spaceId: 'default',
      page: 1,
      size: 100,
      includeInput: false,
      includeOutput: false,
      sort: 'startedAt:asc',
    });
    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
    expect(result.stepExecutionListResult.results).toHaveLength(1);
    expect(result.stepExecutionListResult.total).toBe(1);
    expect(result.stepExecutionListResult.page).toBe(1);
    expect(result.stepExecutionListResult.size).toBe(100);
  });

  it('propagates a size error from the legacy search fallback', async () => {
    mockParent(undefined);
    const error = sizeExceededError();
    workflowsExecutionEngine.searchSteps.mockRejectedValue(error);

    await expect(load()).rejects.toBe(error);
  });

  it('throws when the execution is missing or in another space', async () => {
    workflowsExecutionEngine.getWorkflowExecutionsById.mockResolvedValue([]);

    await expect(load()).rejects.toBeInstanceOf(WorkflowExecutionNotFoundError);
    expect(workflowsExecutionEngine.getStepExecutionsByIds).not.toHaveBeenCalled();
  });

  it('returns managed from the projected parent document', async () => {
    mockParent(['a'], true);
    workflowsExecutionEngine.getStepExecutionsByIds.mockResolvedValue([stepDoc('a')]);

    const result = await load();

    expect(result.workflowExecution.managed).toBe(true);
    expect(result.stepExecutionListResult.results.map((step) => step.id)).toEqual(['a']);
  });

  it('rethrows unexpected errors', async () => {
    mockParent(['a']);
    workflowsExecutionEngine.getStepExecutionsByIds.mockRejectedValue(new Error('boom'));

    await expect(load()).rejects.toThrow('boom');
  });
});
