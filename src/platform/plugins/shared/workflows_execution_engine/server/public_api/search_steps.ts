/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isResponseError } from '@kbn/es-errors';
import type { EsWorkflowStepExecution, WorkflowStepExecutionListDto } from '@kbn/workflows';
import { emptyStepList, isVisibilityDenied } from './lib/query';
import { buildStepSearchQuery, stepSort } from './lib/step_query';
import type { ExecutionReadDeps, SearchStepsParams } from './types';

const hitTotal = (
  response: { hits: { total?: number | { value: number } } },
  isPaginated: boolean,
  resultsLength: number
): number => {
  if (!isPaginated) return resultsLength;
  const total = response.hits.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
};

/**
 * Returns step executions matching the criteria.
 * Workflow id and execution id may both be omitted to search a whole space.
 * An empty `executionIds` array matches nothing. `visibility: deny` returns an empty page and does not query.
 * `includeFields` limits `_source`, including nested paths, and ignores `includeInput` / `includeOutput`.
 * Pass `includeInput: false` or `includeOutput: false` to drop those fields. An empty page means no matches.
 */
export const searchSteps = async (
  deps: ExecutionReadDeps,
  params: SearchStepsParams
): Promise<WorkflowStepExecutionListDto> => {
  const { page, size, sort, includeFields, includeInput, includeOutput } = params;
  // `page` opts into offset paging and an exact total. `size` alone is a capped fetch.
  const isPaginated = page !== undefined;
  const pageSize = size ?? (isPaginated ? 100 : 1000);
  const from = isPaginated ? (page - 1) * pageSize : 0;

  if (isVisibilityDenied(params.visibility)) {
    return emptyStepList(page, isPaginated ? pageSize : undefined);
  }

  const sourceExcludes: string[] = [];
  if (includeInput === false) sourceExcludes.push('input');
  if (includeOutput === false) sourceExcludes.push('output');
  const sourceFilter = includeFields?.length
    ? { includes: [...includeFields] }
    : sourceExcludes.length
    ? { excludes: sourceExcludes }
    : undefined;

  try {
    deps.logger.debug('Searching step executions');
    const response = await deps.stepExecutionsDataClient.search({
      query: buildStepSearchQuery(params),
      ...(sourceFilter ? { _source: sourceFilter } : {}),
      sort: stepSort(sort),
      from,
      size: pageSize,
      track_total_hits: isPaginated,
    });
    const results = response.hits.hits.map((hit) => hit._source as EsWorkflowStepExecution);
    const total = hitTotal(response, isPaginated, results.length);
    return {
      results,
      total,
      ...(isPaginated && page !== undefined && { page, size: pageSize }),
    };
  } catch (error) {
    if (isResponseError(error) && error.body?.error?.type === 'index_not_found_exception') {
      return emptyStepList(page, isPaginated ? pageSize : size);
    }
    deps.logger.error(`Failed to search step executions: ${error}`);
    throw error;
  }
};
