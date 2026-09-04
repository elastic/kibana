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
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { WorkflowExecutionNotFoundError } from '@kbn/workflows/common/errors';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '@kbn/workflows-execution-engine/server/mocks';
import { getExecutionStepExecutions } from './get_execution_step_executions';
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

describe('getExecutionStepExecutions', () => {
  let mockWorkflowDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let mockStepDataClient: jest.Mocked<StepExecutionsDataClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const baseParams = {
    workflowExecutionId: 'exec-1',
    spaceId: 'default',
    page: 1,
    size: 100,
  };

  beforeEach(() => {
    mockWorkflowDataClient = createMockWorkflowDataClient();
    mockStepDataClient = createMockStepDataClient();
    mockLogger = loggerMock.create();
    jest.clearAllMocks();
  });

  const mockParent = (stepExecutionIds?: string[]) => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([
        { spaceId: 'default', stepExecutionIds },
      ] as unknown as EsWorkflowExecution[])
    );
  };

  it('mgets a page of step ids and returns total from the id list', async () => {
    mockParent(['a', 'b', 'c']);
    mockStepDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b')], {
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      })
    );

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
      size: 2,
    });

    expect(mockWorkflowDataClient.getByIds).toHaveBeenCalledWith(['exec-1'], {
      sourceIncludes: ['spaceId', 'managed', 'stepExecutionIds'],
    });
    expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(['a', 'b'], {
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
    mockStepDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([stepDoc('c')], {
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      })
    );

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
      page: 2,
      size: 2,
    });

    expect(mockStepDataClient.getByIds).toHaveBeenCalledWith(['c'], {
      sourceExcludes: ['input', 'output'],
    });
    expect(result.stepExecutionListResult.results.map((step) => step.id)).toEqual(['c']);
    expect(result.stepExecutionListResult.total).toBe(3);
  });

  it('does not mget when the page is past the end of the id list', async () => {
    mockParent(['a']);

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
      page: 2,
      size: 100,
    });

    expect(mockStepDataClient.getByIds).not.toHaveBeenCalled();
    expect(result.stepExecutionListResult).toEqual({ results: [], total: 1, page: 2, size: 100 });
  });

  it('returns empty results with full total when the page mget exceeds the size limit', async () => {
    mockParent(['a', 'b']);
    mockStepDataClient.getByIds.mockRejectedValue(sizeExceededError());

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
    });

    expect(result.stepExecutionListResult.results).toEqual([]);
    expect(result.stepExecutionListResult.total).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to get workflow execution exec-1 with steps: Elasticsearch response exceeded the maximum size Kibana can process (page=1, size=100)'
    );
  });

  it('falls back to search when stepExecutionIds are missing', async () => {
    mockParent(undefined);
    mockStepDataClient.search.mockResolvedValue({
      hits: {
        hits: [{ _source: stepDoc('legacy') }],
        total: { value: 1 },
      },
    } as never);

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
    });

    expect(mockStepDataClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: { excludes: ['input', 'output'] },
      })
    );
    expect(mockStepDataClient.getByIds).not.toHaveBeenCalled();
    expect(result.stepExecutionListResult.results).toHaveLength(1);
    expect(result.stepExecutionListResult.total).toBe(1);
    expect(result.stepExecutionListResult.page).toBe(1);
    expect(result.stepExecutionListResult.size).toBe(100);
  });

  it('returns empty results without a total when search fallback hits a size abort', async () => {
    mockParent(undefined);
    mockStepDataClient.search.mockRejectedValue(sizeExceededError());

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
    });

    expect(result.stepExecutionListResult).toEqual({ results: [], total: 0, page: 1, size: 100 });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to get workflow execution exec-1 with steps: Elasticsearch response exceeded the maximum size Kibana can process (page=1, size=100)'
    );
  });

  it('throws when the execution is missing or in another space', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(createMockGetExecutionsByIdsResponse([]));

    await expect(
      getExecutionStepExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        ...baseParams,
      })
    ).rejects.toBeInstanceOf(WorkflowExecutionNotFoundError);
    expect(mockStepDataClient.getByIds).not.toHaveBeenCalled();
  });

  it('returns managed from the projected parent document', async () => {
    mockWorkflowDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([
        { spaceId: 'default', managed: true, stepExecutionIds: ['a'] },
      ] as unknown as EsWorkflowExecution[])
    );
    mockStepDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([stepDoc('a')], {
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      })
    );

    const result = await getExecutionStepExecutions({
      workflowExecutionsDataClient: mockWorkflowDataClient,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      ...baseParams,
    });

    expect(result.workflowExecution.managed).toBe(true);
    expect(result.stepExecutionListResult.results.map((step) => step.id)).toEqual(['a']);
  });

  it('rethrows unexpected errors', async () => {
    mockParent(['a']);
    mockStepDataClient.getByIds.mockRejectedValue(new Error('boom'));

    await expect(
      getExecutionStepExecutions({
        workflowExecutionsDataClient: mockWorkflowDataClient,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
        ...baseParams,
      })
    ).rejects.toThrow('boom');
  });
});
