/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';
import { isResponseError } from '@kbn/es-errors';
import { fromKueryExpression, KQLSyntaxError, toElasticsearchQuery } from '@kbn/es-query';
import type {
  ExecutionType,
  WorkflowExecutionListDto,
  WorkflowStepExecutionListDto,
} from '@kbn/workflows';
import { ExecutionType as ExecutionTypeEnum } from '@kbn/workflows';
import type { ExecutionVisibility } from '../types';

const WORKFLOW_ID_TERMS_CHUNK = 10_000;

export const isVisibilityDenied = (visibility?: ExecutionVisibility): boolean =>
  visibility?.access === 'deny';

/** Whether a point read of `workflowId` is inside the caller's visibility scope. */
export const isWorkflowVisible = (
  visibility: ExecutionVisibility | undefined,
  workflowId: string | undefined
): boolean => {
  if (!workflowId || !visibility || visibility.access === 'all') {
    return true;
  }
  if (visibility.access === 'deny') {
    return false;
  }
  return !visibility.workflowIds.includes(workflowId);
};

/** `must_not` clauses that hide workflows the caller cannot see. */
export const visibilityMustNot = (
  visibility?: ExecutionVisibility
): estypes.QueryDslQueryContainer[] => {
  if (!visibility || visibility.access !== 'exclude') {
    return [];
  }
  const clauses: estypes.QueryDslQueryContainer[] = [];
  for (let offset = 0; offset < visibility.workflowIds.length; offset += WORKFLOW_ID_TERMS_CHUNK) {
    clauses.push({
      terms: {
        workflowId: [...visibility.workflowIds.slice(offset, offset + WORKFLOW_ID_TERMS_CHUNK)],
      },
    });
  }
  return clauses;
};

/** Matches the space, and documents written before `spaceId` was stored. */
export const workflowExecutionSpaceFilter = (spaceId: string): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
    minimum_should_match: 1,
  },
});

export const buildTimeRangeFilter = (
  field: 'startedAt' | 'finishedAt' | 'createdAt',
  after?: string,
  before?: string
): estypes.QueryDslQueryContainer | undefined => {
  const gte = after ? dateMath.parse(after)?.toISOString() : undefined;
  const lte = before ? dateMath.parse(before, { roundUp: true })?.toISOString() : undefined;
  if (!gte && !lte) {
    return undefined;
  }
  return {
    range: {
      [field]: {
        ...(gte && { gte }),
        ...(lte && { lte }),
      },
    },
  };
};

export const executionTypeFilter = (
  executionTypes?: readonly ExecutionType[]
): estypes.QueryDslQueryContainer | undefined => {
  if (!executionTypes || executionTypes.length !== 1) {
    return undefined;
  }
  const isTestRun = executionTypes[0] === ExecutionTypeEnum.TEST;
  if (isTestRun) {
    return { term: { isTestRun } };
  }
  return {
    bool: {
      should: [
        { term: { isTestRun: false } },
        { bool: { must_not: { exists: { field: 'isTestRun' } } } },
      ],
      minimum_should_match: 1,
    },
  };
};

export const isIndexNotFoundError = (error: unknown): boolean =>
  isResponseError(error) && error.body?.error?.type === 'index_not_found_exception';

const ELASTICSEARCH_QUERY_ERROR_TYPES = new Set([
  'search_phase_execution_exception',
  'query_shard_exception',
  'parsing_exception',
  'illegal_argument_exception',
]);

export const asBadQueryError = (error: unknown): Error | undefined => {
  if (!isResponseError(error)) {
    return undefined;
  }
  const errorTypes = [
    error.body?.error?.type,
    ...(error.body?.error?.root_cause?.map((cause: estypes.ErrorCause) => cause.type) ?? []),
    ...(error.body?.error?.caused_by?.type ? [error.body.error.caused_by.type] : []),
  ];
  if (!errorTypes.some((type) => type != null && ELASTICSEARCH_QUERY_ERROR_TYPES.has(type))) {
    return undefined;
  }
  const message =
    error.body?.error?.root_cause?.[0]?.reason ??
    error.body?.error?.reason ??
    'Invalid search query';
  return Object.assign(new Error(typeof message === 'string' ? message : 'Invalid search query'), {
    statusCode: 400,
  });
};

/** Compiles KQL. Invalid syntax throws an error with `statusCode: 400`. */
export const compileKql = (kql: string): estypes.QueryDslQueryContainer => {
  try {
    return toElasticsearchQuery(fromKueryExpression(kql));
  } catch (error) {
    if (error instanceof KQLSyntaxError) {
      throw Object.assign(new Error(`Invalid KQL: ${error.message}`), { statusCode: 400 });
    }
    throw error;
  }
};

export const emptyExecutionList = (page: number, size: number): WorkflowExecutionListDto => ({
  results: [],
  page,
  size,
  total: 0,
});

export const emptyStepList = (page?: number, size?: number): WorkflowStepExecutionListDto => ({
  results: [],
  total: 0,
  ...(page !== undefined && size !== undefined ? { page, size } : {}),
});

export const hitTotal = (total: number | estypes.SearchTotalHits | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;
