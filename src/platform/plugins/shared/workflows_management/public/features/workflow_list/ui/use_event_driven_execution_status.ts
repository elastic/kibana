/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';

export function useEventDrivenExecutionStatus(): {
  eventDrivenExecutionEnabled: boolean;
  isLoading: boolean;
  error: boolean;
} {
  const api = useWorkflowsApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workflows', 'config'],
    queryFn: () => api.getConfig(),
  });

  return {
    eventDrivenExecutionEnabled: data?.eventDrivenExecutionEnabled ?? true,
    isLoading,
    error: isError,
  };
}
