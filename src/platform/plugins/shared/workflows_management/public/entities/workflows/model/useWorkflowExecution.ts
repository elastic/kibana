/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WorkflowExecutionModel } from '@kbn/workflows';
import { useQuery } from '@tanstack/react-query';

export function useWorkflowExecution(workflowExecutionId: string | null) {
  const { http } = useKibana().services;

  return useQuery<WorkflowExecutionModel>({
    queryKey: ['stepExecutions', workflowExecutionId],
    queryFn: () => http!.get(`/api/workflowExecutions/${workflowExecutionId}`),
    enabled: workflowExecutionId !== null,
  });
}
