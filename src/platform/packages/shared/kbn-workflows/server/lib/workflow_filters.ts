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
export type DeletedFilter = 'all' | 'deleted' | 'not_deleted';

export interface WorkflowQueryFilter {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
}

export interface BuildWorkflowFiltersParams {
  ids?: string[];
  space?: {
    id: string;
    includeGlobal?: boolean | undefined;
  };
  deleted?: DeletedFilter | undefined;
  managed?: ManagedFilter | undefined;
}

/**
 * Builds an Elasticsearch bool filter from the workflow query dimensions that are explicitly set.
 *
 * `deleted` and `managed` are tri-state filters: `'all'` or `undefined` leaves the
 * dimension unfiltered, while the other values add either an inclusion or exclusion clause.
 */
export const buildWorkflowFilters = ({
  ids,
  space,
  deleted,
  managed,
}: BuildWorkflowFiltersParams = {}): WorkflowQueryFilter => {
  const must: estypes.QueryDslQueryContainer[] = [];
  const mustNot: estypes.QueryDslQueryContainer[] = [];

  if (ids?.length) {
    must.push({ ids: { values: ids } });
  }

  if (space) {
    if (space.includeGlobal) {
      must.push({
        bool: {
          should: [
            { term: { spaceId: space.id } },
            { term: { spaceId: GLOBAL_WORKFLOW_SPACE_ID } },
          ],
          minimum_should_match: 1,
        },
      });
    } else {
      must.push({ term: { spaceId: space.id } });
    }
  }

  if (deleted === 'deleted') {
    must.push({ exists: { field: 'deleted_at' } });
  } else if (deleted === 'not_deleted') {
    mustNot.push({ exists: { field: 'deleted_at' } });
  }

  if (managed === 'managed') {
    must.push({ term: { managed: true } });
  } else if (managed === 'unmanaged') {
    mustNot.push({ term: { managed: true } });
  }

  return { must, must_not: mustNot };
};
