/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
import { useWorkflowsApi } from '../api/use_workflows_api';

/**
 * Fetches a paginated/filterable list of workflows.
 *
 * @example
 * ```ts
 * const { data } = useWorkflows({ page: 1, size: 20, query: 'security' });
 * ```
 */
export function useWorkflows(params: WorkflowsSearchParams) {
  const api = useWorkflowsApi();

  return useQuery<WorkflowListDto>({
    networkMode: 'always',
    queryKey: ['workflows', params],
    queryFn: async () => api.getWorkflows(params),
    keepPreviousData: true,
  });
}
