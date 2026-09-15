/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

export const buildWorkflowExecutionsSpaceFilter = (
  spaceId: string
): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
    minimum_should_match: 1,
  },
});

export const buildManagedWorkflowExecutionsFilter = (): estypes.QueryDslQueryContainer => ({
  term: { managed: true },
});

export const buildUnmanagedWorkflowExecutionsFilter = (): estypes.QueryDslQueryContainer => ({
  bool: {
    must_not: [buildManagedWorkflowExecutionsFilter()],
  },
});

export const buildWorkflowExecutionsSearchQuery = (
  userQuery: estypes.QueryDslQueryContainer | undefined,
  spaceId: string,
  options?: { includeManagedExecutions?: boolean }
): estypes.QueryDslQueryContainer => ({
  bool: {
    must: [userQuery ?? { match_all: {} }, buildWorkflowExecutionsSpaceFilter(spaceId)],
    must_not: [
      { exists: { field: 'stepId' } },
      // A parallel branch is a fragment of the run it belongs to, not a run of
      // its own, so it is shown nested inside its parent's detail view rather
      // than as another entry in this list.
      { exists: { field: 'parentExecutionId' } },
      ...(options?.includeManagedExecutions ? [] : [buildManagedWorkflowExecutionsFilter()]),
    ],
  },
});

export const emptyWorkflowExecutionsSearchResponse = (): estypes.SearchResponse<unknown> => ({
  took: 0,
  timed_out: false,
  _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
  hits: {
    total: { value: 0, relation: 'eq' },
    max_score: null,
    hits: [],
  },
});
