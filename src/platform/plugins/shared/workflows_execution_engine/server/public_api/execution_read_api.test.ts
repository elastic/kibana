/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { getStepExecutionsByIds } from './get_step_executions_by_ids';
import { getStepFacets } from './get_step_facets';
import { getWorkflowExecutionsById } from './get_workflow_executions_by_id';
import { searchExecutionView } from './search_execution_view';
import { searchExecutions } from './search_executions';
import { searchSteps } from './search_steps';
import type { ExecutionReadDeps } from './types';
import {
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '../repositories/data_access_layer/mocks';

const emptyHits = { hits: { hits: [], total: { value: 0 } } };

describe('execution read API', () => {
  const workflowExecutionsDataClient = createMockWorkflowDataClient();
  const stepExecutionsDataClient = createMockStepDataClient();
  const deps: ExecutionReadDeps = {
    logger: loggerMock.create(),
    workflowExecutionsDataClient,
    stepExecutionsDataClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    workflowExecutionsDataClient.search.mockResolvedValue(emptyHits as never);
    stepExecutionsDataClient.search.mockResolvedValue(emptyHits as never);
  });

  it('does not query when visibility denies the read', async () => {
    const page = await searchExecutions(deps, {
      spaceId: 'default',
      visibility: { access: 'deny' },
    });

    expect(page).toEqual({ results: [], page: 1, size: 100, total: 0 });
    expect(workflowExecutionsDataClient.search).not.toHaveBeenCalled();
  });

  it('excludes hidden workflow ids from an execution search', async () => {
    await searchExecutions(deps, {
      spaceId: 'default',
      visibility: { access: 'exclude', workflowIds: ['hidden'] },
    });

    const query = workflowExecutionsDataClient.search.mock.calls[0][0].query as {
      bool: { must_not: unknown[] };
    };
    expect(query.bool.must_not).toEqual([{ terms: { workflowId: ['hidden'] } }]);
  });

  it('keeps an open step search off the unindexed stepType field', async () => {
    await searchSteps(deps, {
      spaceId: 'default',
      statuses: [ExecutionStatus.WAITING_FOR_INPUT],
      settlement: 'open',
      page: 1,
      size: 25,
    });

    const request = stepExecutionsDataClient.search.mock.calls[0][0];
    const must = (request.query as { bool: { must: Array<{ term?: Record<string, string> }> } })
      .bool.must;
    expect(must).toHaveLength(2);
    expect(must).toEqual([
      { term: { spaceId: 'default' } },
      { term: { status: 'waiting_for_input' } },
    ]);
    expect((request.query as { bool: { must_not: unknown[] } }).bool.must_not).toEqual([
      { exists: { field: 'finishedAt' } },
      { exists: { field: 'hitl.respondedAt' } },
    ]);
  });

  it('throws statusCode 400 for invalid KQL', async () => {
    await expect(
      searchExecutionView(deps, { spaceId: 'default', kql: 'status:' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(workflowExecutionsDataClient.search).not.toHaveBeenCalled();
  });

  it('returns step executions in the requested space and leaves the rest out', async () => {
    stepExecutionsDataClient.getByIds.mockResolvedValue({
      items: [
        { document: { id: 'a', spaceId: 'default' }, index: 'steps' },
        { document: { id: 'b', spaceId: 'other' }, index: 'steps' },
      ],
      missing: ['c'],
    } as never);

    const steps = await getStepExecutionsByIds(deps, { ids: ['a', 'b', 'c'], spaceId: 'default' });

    expect(steps).toEqual([{ id: 'a', spaceId: 'default' }]);
    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a', 'b', 'c'], {
      sourceIncludes: undefined,
      sourceExcludes: undefined,
    });
  });

  it('drops step input and output without narrowing the rest of the document', async () => {
    stepExecutionsDataClient.getByIds.mockResolvedValue({ items: [], missing: [] } as never);

    await getStepExecutionsByIds(deps, {
      ids: ['a'],
      spaceId: 'default',
      includeInput: false,
      includeOutput: false,
    });

    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a'], {
      sourceIncludes: undefined,
      sourceExcludes: ['input', 'output'],
    });
  });

  it('lets includeInput keep a field without turning the read into an allow-list', async () => {
    stepExecutionsDataClient.getByIds.mockResolvedValue({ items: [], missing: [] } as never);

    await getStepExecutionsByIds(deps, {
      ids: ['a'],
      spaceId: 'default',
      sourceExcludes: ['input', 'output'],
      includeInput: true,
    });

    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a'], {
      sourceIncludes: undefined,
      sourceExcludes: ['output'],
    });
  });

  it('adds spaceId to a caller include list and strips it from the result', async () => {
    stepExecutionsDataClient.getByIds.mockResolvedValue({
      items: [{ document: { id: 'a', spaceId: 'default', status: 'completed' }, index: 'steps' }],
      missing: [],
    } as never);

    const steps = await getStepExecutionsByIds(deps, {
      ids: ['a'],
      spaceId: 'default',
      sourceIncludes: ['status'],
      includeInput: true,
    });

    expect(stepExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a'], {
      sourceIncludes: ['status', 'spaceId'],
      sourceExcludes: undefined,
    });
    expect(steps).toEqual([{ id: 'a', status: 'completed' }]);
  });

  it('returns workflow executions in the requested space and leaves the rest out', async () => {
    workflowExecutionsDataClient.getByIds.mockResolvedValue({
      items: [
        { document: { id: 'a', spaceId: 'default' }, index: 'executions' },
        { document: { id: 'b', spaceId: 'other' }, index: 'executions' },
      ],
      missing: ['c'],
    } as never);

    const executions = await getWorkflowExecutionsById(deps, {
      ids: ['a', 'b', 'c'],
      spaceId: 'default',
    });

    expect(executions).toEqual([{ id: 'a', spaceId: 'default' }]);
    expect(workflowExecutionsDataClient.getByIds).toHaveBeenCalledWith(['a', 'b', 'c'], {
      sourceIncludes: undefined,
      sourceExcludes: undefined,
    });
  });

  it('does not query when no workflow execution ids are requested', async () => {
    const executions = await getWorkflowExecutionsById(deps, { ids: [], spaceId: 'default' });

    expect(executions).toEqual([]);
    expect(workflowExecutionsDataClient.getByIds).not.toHaveBeenCalled();
  });

  it('does not query when no step ids are requested', async () => {
    const steps = await getStepExecutionsByIds(deps, { ids: [], spaceId: 'default' });

    expect(steps).toEqual([]);
    expect(stepExecutionsDataClient.getByIds).not.toHaveBeenCalled();
  });

  it('aggregates only the requested facet fields', async () => {
    stepExecutionsDataClient.search.mockResolvedValue({
      aggregations: { status: { buckets: [{ key: 'completed', doc_count: 2 }] } },
    } as never);

    const facets = await getStepFacets(deps, {
      spaceId: 'default',
      fields: ['status'],
      maxBuckets: 5,
    });

    expect(facets).toEqual({ status: [{ value: 'completed', count: 2 }] });
    const request = stepExecutionsDataClient.search.mock.calls[0][0];
    expect(request.size).toBe(0);
    expect(request.aggs).toEqual({ status: { terms: { field: 'status', size: 5 } } });
  });
});
