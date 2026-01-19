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

export function useWorkflows(params: WorkflowsSearchParams) {
  const { http } = useKibana().services;

  return useQuery<WorkflowListDto>({
    networkMode: 'always',
    queryKey: ['workflows', params],
    queryFn: async () => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return http.post<WorkflowListDto>('/api/workflows/search', {
        body: JSON.stringify(params),
      });
    },
    keepPreviousData: true,
  });
}
