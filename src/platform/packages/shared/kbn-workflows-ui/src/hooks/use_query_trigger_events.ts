/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { SearchTriggerEventLogParams, SearchTriggerEventLogResult } from '../api/types';
import { useWorkflowsApi } from '../api/use_workflows_api';

export type WorkflowTriggerEventsLogQueryKey = readonly [
  'workflowTriggerEventsLog',
  string | undefined,
  string | undefined,
  string | undefined,
  number | undefined,
  number | undefined
];

/**
 * Primitive query-key parts so equivalent searches share a cache entry even when
 * callers pass a new `params` object reference each render.
 */
export const getWorkflowTriggerEventsLogQueryKey = (
  params: SearchTriggerEventLogParams
): WorkflowTriggerEventsLogQueryKey => [
  'workflowTriggerEventsLog',
  params.kql,
  params.from,
  params.to,
  params.page,
  params.size,
];

export function useQueryTriggerEvents(
  params: SearchTriggerEventLogParams,
  options?: { enabled?: boolean }
) {
  const api = useWorkflowsApi();

  return useQuery<SearchTriggerEventLogResult>({
    networkMode: 'always',
    queryKey: getWorkflowTriggerEventsLogQueryKey(params),
    queryFn: () => api.searchTriggerEvents(params),
    enabled: options?.enabled ?? true,
    keepPreviousData: true,
  });
}
