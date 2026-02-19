/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../hooks/use_kibana';

export interface WorkflowHistoryResponse {
  startDate?: string;
  total: number;
  items: WorkflowHistoryItem[];
}

export interface WorkflowHistoryItem {
  '@timestamp': string;
  user?: { id?: string; name?: string };
  event?: { id?: string; action?: string };
  object?: { fields?: { changed?: string[] }; id?: string; type?: string };
}

export function useWorkflowHistory(
  workflowId: string | undefined,
  opts?: { from?: number; size?: number }
) {
  const { http } = useKibana().services;

  return useQuery<WorkflowHistoryResponse>({
    queryKey: ['workflows', workflowId ?? '', 'history', opts?.from, opts?.size],
    queryFn: async () => {
      if (!workflowId) {
        return { total: 0, items: [] };
      }
      const params = new URLSearchParams();
      if (opts?.from !== undefined) params.set('from', String(opts.from));
      if (opts?.size !== undefined) params.set('size', String(opts.size));
      const query = params.toString();
      const url = query
        ? `/api/workflows/${workflowId}/history?${query}`
        : `/api/workflows/${workflowId}/history`;
      return http.get<WorkflowHistoryResponse>(url);
    },
    enabled: !!workflowId,
  });
}
