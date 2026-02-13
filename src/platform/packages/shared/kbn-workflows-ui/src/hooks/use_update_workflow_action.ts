/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMutation, type UseMutationOptions } from '@kbn/react-query';
import type { WorkflowDetailDto } from '@kbn/workflows';

export interface UpdateWorkflowActionParams {
  id: string;
  workflow: Partial<WorkflowDetailDto>;
}

type HttpError = IHttpFetchError<ResponseErrorBody>;

export const useUpdateWorkflowAction = <
  TVariables extends UpdateWorkflowActionParams = UpdateWorkflowActionParams,
  TContext = unknown
>(
  options?: UseMutationOptions<void, HttpError, TVariables, TContext>
) => {
  const { http } = useKibana().services;

  return useMutation<void, HttpError, TVariables, TContext>({
    mutationKey: ['PUT', 'workflows', 'id'],
    mutationFn: ({ id, workflow }) => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
    },
    ...options,
  });
};
