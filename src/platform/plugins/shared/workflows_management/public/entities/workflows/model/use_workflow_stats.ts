/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import type { WorkflowStatsDto } from '@kbn/workflows/types/v1';
import type { EuiSelectableOption } from '@elastic/eui';

export function useWorkflowStats() {
  const { http } = useKibana().services;

  return useQuery<WorkflowStatsDto>({
    queryKey: ['workflows', 'stats'],
    queryFn: () => http!.get(`/api/workflows/stats`),
  });
}

export function useWorkflowFiltersOptions(fields: string[]) {
  const { http } = useKibana().services;

  return useQuery<Record<string, Array<EuiSelectableOption>>>({
    queryKey: ['workflows', 'aggs', fields],
    queryFn: () => http!.get(`/api/workflows/aggs`, { query: { fields } }),
  });
}
