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

export function useQueryTriggerEvents(
  params: SearchTriggerEventLogParams,
  options?: { enabled?: boolean }
) {
  const api = useWorkflowsApi();

  return useQuery<SearchTriggerEventLogResult>({
    networkMode: 'always',
    queryKey: ['workflowTriggerEventsLog', params],
    queryFn: () => api.searchTriggerEvents(params),
    enabled: options?.enabled ?? true,
    keepPreviousData: true,
  });
}
