/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { WorkflowListDto, WorkflowsSearchParams } from '@kbn/workflows';
import { searchWorkflows } from '../services/search_workflows';

/**
 * Fetches a paginated/filterable list of workflows.
 *
 * Sends `POST /api/workflows/search` with the provided search params.
 *
 * @example
 * ```ts
 * const { data } = useWorkflows({ page: 1, size: 20, query: 'security' });
 * ```
 */
export function useWorkflows(params: WorkflowsSearchParams) {
  const { http } = useKibana().services;

  return useQuery<WorkflowListDto>({
    networkMode: 'always',
    queryKey: ['workflows', params],
    queryFn: async () => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return searchWorkflows(http, params);
    },
    keepPreviousData: true,
  });
}
