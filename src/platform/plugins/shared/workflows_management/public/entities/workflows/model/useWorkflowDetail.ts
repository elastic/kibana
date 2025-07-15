/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkflowModel } from '@kbn/workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function useWorkflowDetail(id: string) {
  const { http } = useKibana().services;

  const queryResult = useQuery<WorkflowModel>({
    queryKey: ['workflows', id],
    queryFn: () => http!.get(`/api/workflows/${id}`),
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows', id] });
  };

  return { ...queryResult, refresh };
}
