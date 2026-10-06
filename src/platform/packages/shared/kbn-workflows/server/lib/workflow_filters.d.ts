/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
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
export declare const buildWorkflowFilters: ({
  ids,
  space,
  deleted,
  managed,
}?: BuildWorkflowFiltersParams) => WorkflowQueryFilter;
