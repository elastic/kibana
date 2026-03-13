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
import type { RunWorkflowCommand, RunWorkflowResponseDto } from '@kbn/workflows';

type HttpError = IHttpFetchError<ResponseErrorBody>;

export type RunWorkflowParams = RunWorkflowCommand & {
  /** Workflow ID to run. */
  id: string;
};

/**
 * Runs a workflow.
 *
 * Sends `POST /api/workflows/{id}/run` with `{ inputs }`.
 * Call with `{ id, inputs }`:
 * - `id`: workflow ID to run
 * - `inputs`: runtime input values consumed by the workflow
 *
 * @example
 * ```ts
 * const { mutate: runWorkflow } = useRunWorkflow();
 *
 * runWorkflow({
 *   id: workflowId,
 *   inputs: { alertIds: ['alert-1'] }
 * });
 * ```
 */
export const useRunWorkflow = <P extends object = {}>(
  options?: UseMutationOptions<RunWorkflowResponseDto, HttpError, RunWorkflowParams & P>
) => {
  const { http } = useKibana().services;

  return useMutation<RunWorkflowResponseDto, HttpError, RunWorkflowParams & P>({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ id, inputs }) => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return http.post(`/api/workflows/${id}/run`, {
        body: JSON.stringify({ inputs }),
      });
    },
    ...options,
  });
};
