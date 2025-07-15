/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowModel } from '@kbn/workflows';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function useWorkflowActions() {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;

  const createWorkflow = useMutation({
    mutationKey: ['POST', 'workflows'],
    mutationFn: (workflow: WorkflowModel) => {
      return http!.post('/api/workflows', {
        body: JSON.stringify(workflow),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const updateWorkflow = useMutation({
    mutationKey: ['PUT', 'workflows', 'id'],
    mutationFn: ({ id, workflow }: { id: string; workflow: WorkflowModel }) => {
      return http!.put(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  return {
    createWorkflow,
    updateWorkflow,
  };
}
