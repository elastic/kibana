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
import { searchExecutionDocuments } from './lib/execution_list';
import {
  buildTimeRangeFilter,
  compileKql,
  emptyExecutionList,
  executionTypeFilter,
  isVisibilityDenied,
  visibilityMustNot,
  workflowExecutionSpaceFilter,
} from './lib/query';
import type { ExecutionReadDeps, SearchExecutionViewParams } from './types';

const DEFAULT_PAGE_SIZE = 100;

/**
 * Returns workflow runs across a space, excluding step-scoped documents.
 * `kql` is compiled here; invalid KQL throws an error with `statusCode: 400`.
 * `includeManaged` defaults to false and drops managed runs. `visibility: deny` returns an empty page.
 * A missing index returns an empty page.
 */
export const searchExecutionView = async (
  deps: ExecutionReadDeps,
  params: SearchExecutionViewParams
): Promise<WorkflowExecutionListDto> => {
  const page = params.page ?? 1;
  const size = params.size ?? DEFAULT_PAGE_SIZE;
  if (isVisibilityDenied(params.visibility)) {
    return emptyExecutionList(page, size);
  }

  const must: estypes.QueryDslQueryContainer[] = [workflowExecutionSpaceFilter(params.spaceId)];
  const mustNot: estypes.QueryDslQueryContainer[] = [
    { exists: { field: 'stepId' } },
    ...visibilityMustNot(params.visibility),
  ];
  if (!params.includeManaged) {
    mustNot.push({ term: { managed: true } });
  }
  if (params.kql) {
    must.push(compileKql(params.kql));
  }
  if (params.statuses?.length) {
    must.push({ terms: { status: [...params.statuses] } });
  }
  const typeFilter = executionTypeFilter(params.executionTypes);
  if (typeFilter) must.push(typeFilter);
  if (params.executedBy?.length) {
    must.push({ terms: { executedBy: [...params.executedBy] } });
  }
  if (params.concurrencyGroupKey !== undefined) {
    must.push({ term: { concurrencyGroupKey: params.concurrencyGroupKey } });
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
    ? ([{ [params.sortField]: { order: params.sortOrder ?? 'desc' } }] as estypes.Sort)
    : undefined;

  return searchExecutionDocuments({
    client: deps.workflowExecutionsDataClient,
    logger: deps.logger,
    query: { bool: { must, must_not: mustNot } },
    sort,
    size,
    from: (page - 1) * size,
    page,
    collapse: params.collapse ? { field: params.collapse } : undefined,
  });
};
