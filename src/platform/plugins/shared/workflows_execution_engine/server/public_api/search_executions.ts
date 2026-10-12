/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { WorkflowExecutionListDto } from '@kbn/workflows';
import { DEFAULT_EXECUTION_SORT, searchExecutionDocuments } from './lib/execution_list';
import {
  buildTimeRangeFilter,
  emptyExecutionList,
  executionTypeFilter,
  isVisibilityDenied,
  visibilityMustNot,
  workflowExecutionSpaceFilter,
} from './lib/query';
import type { ExecutionReadDeps, SearchExecutionsParams } from './types';

const DEFAULT_PAGE_SIZE = 100;

/**
 * Returns a page of workflow executions for one space, optionally one workflow.
 * `visibility: deny` returns an empty page and does not query. `exclude` drops those workflow ids.
 * `omitStepRuns` drops executions that belong to a single step. A missing index returns an empty page.
 * `searchAfter` continues from a previous page's cursor instead of `page`.
 */
export const searchExecutions = async (
  deps: ExecutionReadDeps,
  params: SearchExecutionsParams
): Promise<WorkflowExecutionListDto> => {
  const page = params.page ?? 1;
  const size = params.size ?? DEFAULT_PAGE_SIZE;
  if (isVisibilityDenied(params.visibility)) {
    return emptyExecutionList(page, size);
  }

  const must: estypes.QueryDslQueryContainer[] = [workflowExecutionSpaceFilter(params.spaceId)];
  const mustNot = visibilityMustNot(params.visibility);

  if (params.workflowId) {
    must.unshift({ term: { workflowId: params.workflowId } });
  }
  if (params.statuses) {
    must.push({ terms: { status: [...params.statuses] } });
  }
  const typeFilter = executionTypeFilter(params.executionTypes);
  if (typeFilter) must.push(typeFilter);
  if (params.executedBy && params.executedBy.length > 0) {
    must.push({ terms: { executedBy: [...params.executedBy] } });
  }
  if (params.concurrencyGroupKey !== undefined) {
    must.push({ term: { concurrencyGroupKey: params.concurrencyGroupKey } });
  }
  if (params.omitStepRuns) {
    must.push({ bool: { must_not: { exists: { field: 'stepId' } } } });
  }
  const startedAtRange = buildTimeRangeFilter(
    'startedAt',
    params.timeRange?.startedAfter,
    params.timeRange?.startedBefore
  );
  if (startedAtRange) must.push(startedAtRange);
  const finishedAtRange = buildTimeRangeFilter(
    'finishedAt',
    params.timeRange?.finishedAfter,
    params.timeRange?.finishedBefore
  );
  if (finishedAtRange) must.push(finishedAtRange);

  const sort = params.sortField
    ? ([
        { [params.sortField]: { order: params.sortOrder ?? 'desc' } },
        { id: 'desc' },
      ] as estypes.Sort)
    : DEFAULT_EXECUTION_SORT;

  return searchExecutionDocuments({
    client: deps.workflowExecutionsDataClient,
    logger: deps.logger,
    query: {
      bool: {
        must,
        ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
      },
    },
    size,
    from: params.searchAfter?.length ? undefined : (page - 1) * size,
    page,
    sort,
    searchAfter: params.searchAfter,
    collapse: params.collapse ? { field: params.collapse } : undefined,
  });
};
