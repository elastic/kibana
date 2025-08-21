/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import type { WorkflowListDto } from '@kbn/workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowsSearchParams } from '../../../types';

export function useWorkflows(params: WorkflowsSearchParams) {
  const { http } = useKibana().services;

  return useQuery<WorkflowListDto>({
    queryKey: ['workflows', params],
    queryFn: () =>
      http!.post<WorkflowListDto>('/api/workflows/search', {
        body: JSON.stringify(params),
      }),
    keepPreviousData: true,
  });
}
