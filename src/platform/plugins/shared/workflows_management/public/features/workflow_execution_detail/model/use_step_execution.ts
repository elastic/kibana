/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { useQuery } from '@tanstack/react-query';

export function useStepExecution(workflowExecutionId: string, stepId: string) {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['stepExecution', workflowExecutionId, stepId],
    queryFn: async () => {
      const response = await http!.get<EsWorkflowStepExecution>(
        `/api/workflowExecutions/${workflowExecutionId}/steps/${stepId}`
      );
      return response;
    },
    enabled: !!workflowExecutionId && !!stepId,
    staleTime: 5000, // Refresh every 5 seconds for real-time logs
    refetchInterval: 5000, // Auto-refresh logs
  });
}
