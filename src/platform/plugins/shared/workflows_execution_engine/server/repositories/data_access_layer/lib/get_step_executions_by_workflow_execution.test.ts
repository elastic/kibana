/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { getStepExecutionsByWorkflowExecution } from './get_step_executions_by_workflow_execution';
import { createMockGetExecutionsByIdsResponse, createMockStepDataClient } from '../mocks';

const stepDoc = (id: string): EsWorkflowStepExecution =>
  ({
    id,
    stepId: id,
    status: 'completed',
  }) as EsWorkflowStepExecution;

describe('getStepExecutionsByWorkflowExecution', () => {
  const workflowExecutionId = 'exec-1';

  it('slices mget ids when maxSteps is set', async () => {
    const stepExecutionsDataClient = createMockStepDataClient();
    stepExecutionsDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b')])
    );

    const result = await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      workflowExecutionId,
      stepExecutionIds: ['a', 'b', 'c'],
      maxSteps: 2,
    });

    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a', 'b'], {
      sourceExcludes: undefined,
    });
    expect(result.map((step) => step.id)).toEqual(['a', 'b']);
    expect(stepExecutionsDataClient.search).not.toHaveBeenCalled();
  });

  it('mgets all ids when maxSteps is omitted', async () => {
    const stepExecutionsDataClient = createMockStepDataClient();
    stepExecutionsDataClient.getByIds.mockResolvedValue(
      createMockGetExecutionsByIdsResponse([stepDoc('a'), stepDoc('b'), stepDoc('c')])
    );

    await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      workflowExecutionId,
      stepExecutionIds: ['a', 'b', 'c'],
    });

    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a', 'b', 'c'], {
      sourceExcludes: undefined,
    });
  });

  it('caps legacy search size when maxSteps is set', async () => {
    const stepExecutionsDataClient = createMockStepDataClient();
    stepExecutionsDataClient.search.mockResolvedValue({
      hits: { hits: [{ _source: stepDoc('legacy') }] },
    } as never);

    const result = await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      workflowExecutionId,
      maxSteps: 5000,
    });

    expect(stepExecutionsDataClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 5000,
        sort: 'startedAt:asc',
      })
    );
    expect(result.map((step) => step.id)).toEqual(['legacy']);
  });

  it('searches with size 10000 when maxSteps is omitted', async () => {
    const stepExecutionsDataClient = createMockStepDataClient();
    stepExecutionsDataClient.search.mockResolvedValue({
      hits: { hits: [] },
    } as never);

    await getStepExecutionsByWorkflowExecution({
      stepExecutionsDataClient,
      workflowExecutionId,
    });

    expect(stepExecutionsDataClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 10_000,
        sort: 'startedAt:asc',
      })
    );
  });
});
