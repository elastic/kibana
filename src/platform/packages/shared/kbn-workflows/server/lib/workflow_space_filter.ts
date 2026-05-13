/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { GLOBAL_WORKFLOW_SPACE_ID } from '../constants';

export type ManagedFilter = 'all' | 'managed' | 'unmanaged';

export interface WorkflowQueryFilter {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
}

export const buildWorkflowSpaceFilter = (
  spaceId: string,
  opts?: { includeDeleted?: boolean; includeGlobal?: boolean }
): WorkflowQueryFilter => {
  const must: estypes.QueryDslQueryContainer[] = opts?.includeGlobal
    ? [
        {
          bool: {
            should: [{ term: { spaceId } }, { term: { spaceId: GLOBAL_WORKFLOW_SPACE_ID } }],
            minimum_should_match: 1,
          },
        },
      ]
    : [{ term: { spaceId } }];

  const mustNot: estypes.QueryDslQueryContainer[] = opts?.includeDeleted
    ? []
    : [{ exists: { field: 'deleted_at' } }];

  return { must, must_not: mustNot };
};

export const applyManagedFilter = (
  managedFilter: ManagedFilter | undefined,
  query: WorkflowQueryFilter
): void => {
  if (managedFilter === 'managed') {
    query.must.push({ term: { managed: true } });
    return;
  }

  if (managedFilter === 'unmanaged') {
    query.must_not.push({ term: { managed: true } });
  }
};
