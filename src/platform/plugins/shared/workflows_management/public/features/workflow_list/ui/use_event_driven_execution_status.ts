/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { WORKFLOWS_CONFIG_PATH } from '../../../../common/routes';
import { useKibana } from '../../../hooks/use_kibana';

export interface WorkflowsConfig {
  eventDrivenExecutionEnabled: boolean;
}

export function useEventDrivenExecutionStatus(): {
  eventDrivenExecutionEnabled: boolean;
  isLoading: boolean;
  error: boolean;
} {
  const { http } = useKibana().services;

  const { data, isLoading, isError } = useQuery<WorkflowsConfig>({
    queryKey: ['workflows', 'config'],
    queryFn: async () => {
      if (!http) {
        throw new Error('Http service is not available');
      }
      return http.get<WorkflowsConfig>(WORKFLOWS_CONFIG_PATH);
    },
  });

  return {
    eventDrivenExecutionEnabled: data?.eventDrivenExecutionEnabled ?? true,
    isLoading,
    error: isError,
  };
}
