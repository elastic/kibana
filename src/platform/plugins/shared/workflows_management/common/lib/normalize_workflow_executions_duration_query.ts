/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isDurationValue, parseDuration } from './parse_duration';

const WORKFLOW_EXECUTION_DURATION_FIELD = 'duration';
const DURATION_RANGE_OPERATORS = ['gt', 'gte', 'lt', 'lte'] as const;

const normalizeDurationLiteral = (value: unknown): unknown => {
  if (typeof value !== 'string' || !isDurationValue(value)) {
    return value;
  }

  try {
    return parseDuration(value);
  } catch {
    return value;
  }
};

const normalizeDurationRangeClause = (
  rangeClause: Record<string, unknown>
): Record<string, unknown> => {
  const durationRange = rangeClause[WORKFLOW_EXECUTION_DURATION_FIELD];
  if (durationRange == null || typeof durationRange !== 'object' || Array.isArray(durationRange)) {
    return rangeClause;
  }

  const normalizedDurationRange = { ...(durationRange as Record<string, unknown>) };
  for (const operator of DURATION_RANGE_OPERATORS) {
    if (operator in normalizedDurationRange) {
      normalizedDurationRange[operator] = normalizeDurationLiteral(
        normalizedDurationRange[operator]
      );
    }
  }

  return {
    ...rangeClause,
    [WORKFLOW_EXECUTION_DURATION_FIELD]: normalizedDurationRange,
  };
};

const normalizeDurationTermClause = (
  termClause: Record<string, unknown>
): Record<string, unknown> => {
  if (!(WORKFLOW_EXECUTION_DURATION_FIELD in termClause)) {
    return termClause;
  }

  return {
    ...termClause,
    [WORKFLOW_EXECUTION_DURATION_FIELD]: normalizeDurationLiteral(
      termClause[WORKFLOW_EXECUTION_DURATION_FIELD]
    ),
  };
};

const normalizeQueryList = (
  queries?: QueryDslQueryContainer | QueryDslQueryContainer[]
): QueryDslQueryContainer | QueryDslQueryContainer[] | undefined => {
  if (queries == null) {
    return queries;
  }

  return Array.isArray(queries)
    ? queries.map(normalizeWorkflowExecutionsDurationQuery)
    : normalizeWorkflowExecutionsDurationQuery(queries);
};

export const normalizeWorkflowExecutionsDurationQuery = (
  query: QueryDslQueryContainer | undefined
): QueryDslQueryContainer | undefined => {
  if (query == null) {
    return query;
  }

  if ('range' in query && query.range) {
    return {
      range: normalizeDurationRangeClause(query.range as Record<string, unknown>),
    } as QueryDslQueryContainer;
  }

  if (
    'term' in query &&
    query.term &&
    typeof query.term === 'object' &&
    !Array.isArray(query.term)
  ) {
    return {
      term: normalizeDurationTermClause(query.term as Record<string, unknown>),
    } as QueryDslQueryContainer;
  }

  if ('bool' in query && query.bool) {
    const { bool } = query;
    return {
      bool: {
        ...bool,
        must: normalizeQueryList(bool.must),
        should: normalizeQueryList(bool.should),
        must_not: normalizeQueryList(bool.must_not),
        filter: normalizeQueryList(bool.filter),
      },
    };
  }

  return query;
};
