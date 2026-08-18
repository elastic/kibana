/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { WorkflowExecutionContext, WorkflowExecutionListDto } from '@kbn/workflows';
import type { SearchExecutionsParams } from '../api/types';
import { useWorkflowsApi } from '../api/use_workflows_api';

export interface UseWorkflowExecutionsParams
  extends Omit<SearchExecutionsParams, 'contextType' | 'contextId'> {
  executionContext: WorkflowExecutionContext;
}

/**
 * Fetches executions associated with one product entity context.
 */
export const useWorkflowExecutions = ({
  executionContext,
  ...params
}: UseWorkflowExecutionsParams) => {
  const api = useWorkflowsApi();
  const searchParams = {
    ...params,
    contextType: executionContext.type,
    contextId: executionContext.id,
  };

  return useQuery<WorkflowExecutionListDto>({
    networkMode: 'always',
    queryKey: ['workflowExecutions', searchParams],
    queryFn: () => api.searchExecutions(searchParams),
    keepPreviousData: true,
  });
};
