/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { StepExecutionsDataClient } from '@kbn/workflows-execution-engine/server';
import { createMockStepDataClient } from '@kbn/workflows-execution-engine/server/mocks';
import { searchStepExecutions } from './search_step_executions';

describe('searchStepExecutions', () => {
  let mockStepDataClient: jest.Mocked<StepExecutionsDataClient>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  const baseParams = {
    stepExecutionsDataClient: {} as StepExecutionsDataClient,
    logger: loggerMock.create(),
    spaceId: 'default',
  };

  beforeEach(() => {
    mockStepDataClient = createMockStepDataClient();
    mockLogger = loggerMock.create();
    jest.clearAllMocks();
  });

  it('should throw when neither workflowExecutionId nor workflowId is provided', async () => {
    await expect(
      searchStepExecutions({
        ...baseParams,
        stepExecutionsDataClient: mockStepDataClient,
        logger: mockLogger,
      })
    ).rejects.toThrow('Either workflowExecutionId or workflowId must be provided');
    expect(mockStepDataClient.search).not.toHaveBeenCalled();
  });

  it('should call ES with workflowExecutionId and return results with total', async () => {
    const stepResults = [
      {
        id: 'step-1',
        stepId: 's1',
        workflowRunId: 'run-1',
        workflowId: 'wf-1',
        spaceId: 'default',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00Z',
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
    ];
    mockStepDataClient.search.mockResolvedValue({
      hits: {
        hits: stepResults.map((s) => ({ _source: s })),
        total: 1,
      },
    } as any);

    const result = await searchStepExecutions({
      ...baseParams,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowExecutionId: 'run-1',
    });

    expect(result.results).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.results[0].id).toBe('step-1');
    expect(mockStepDataClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: expect.arrayContaining([
              { term: { spaceId: 'default' } },
              { term: { workflowRunId: 'run-1' } },
            ]),
          },
        },
      })
    );
  });

  it('should call ES with workflowId and optional stepId', async () => {
    mockStepDataClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0 } },
    } as any);

    await searchStepExecutions({
      ...baseParams,
      stepExecutionsDataClient: mockStepDataClient,
      logger: mockLogger,
      workflowId: 'wf-1',
      stepId: 'my_step',
      page: 1,
      size: 50,
    });

    expect(mockStepDataClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: expect.arrayContaining([
              { term: { spaceId: 'default' } },
              { term: { workflowId: 'wf-1' } },
              { term: { stepId: 'my_step' } },
            ]),
          },
        },
        from: 0,
        size: 50,
        track_total_hits: true,
      })
    );
  });
});
