/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowsSearchParams } from '../../types';

export interface WorkflowsData {
  _pagination: {
    total: number;
  };
}

export function shouldShowWorkflowsEmptyState(
  workflows: WorkflowsData | undefined,
  search: WorkflowsSearchParams
): boolean {
  const hasNoWorkflows = workflows?._pagination.total === 0;
  const hasNoFilters =
    !search.query &&
    (!search.enabled || search.enabled.length === 0) &&
    (!search.createdBy || search.createdBy.length === 0);

  return hasNoWorkflows && hasNoFilters;
}
