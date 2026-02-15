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
import type { RunStepCommand, RunWorkflowResponseDto } from '@kbn/workflows';

type HttpError = IHttpFetchError<ResponseErrorBody>;

export const useRunWorkflowStepAction = (
  options?: UseMutationOptions<RunWorkflowResponseDto, HttpError, RunStepCommand>
) => {
  const { http } = useKibana().services;

  return useMutation<RunWorkflowResponseDto, HttpError, RunStepCommand>({
    mutationKey: ['POST', 'workflows', 'stepId', 'run'],
    mutationFn: ({ stepId, contextOverride, workflowYaml }) => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return http.post(`/api/workflows/testStep`, {
        body: JSON.stringify({ stepId, contextOverride, workflowYaml }),
      });
    },
    ...options,
  });
};
