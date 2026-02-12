/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation } from '@kbn/react-query';
import type { UseMutationOptions } from '@kbn/react-query';
import type { RunWorkflowCommand, RunWorkflowResponseDto } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

export type RunWorkflowActionParams = RunWorkflowCommand & {
  id: string;
  triggerTab?: 'manual' | 'alert' | 'index';
};

type HttpError = IHttpFetchError<ResponseErrorBody>;

export const useRunWorkflowAction = (
  options?: UseMutationOptions<RunWorkflowResponseDto, HttpError, RunWorkflowActionParams>
) => {
  const { http } = useKibana().services;

  return useMutation<RunWorkflowResponseDto, HttpError, RunWorkflowActionParams>({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ id, inputs }) => {
      return http.post(`/api/workflows/${id}/run`, {
        body: JSON.stringify({ inputs }),
      });
    },
    ...options,
  });
};
