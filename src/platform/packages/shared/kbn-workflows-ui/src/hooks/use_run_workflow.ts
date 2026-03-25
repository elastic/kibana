/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useMutation, type UseMutationOptions } from '@kbn/react-query';
import type { RunWorkflowResponseDto } from '@kbn/workflows';
import type { RunWorkflowOptions } from '../api/types';
import { useWorkflowsApi } from '../api/use_workflows_api';

type HttpError = IHttpFetchError<ResponseErrorBody>;

export type RunWorkflowParams = RunWorkflowOptions & {
  /** Workflow ID to run. */
  id: string;
};

/**
 * Runs a workflow.
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
  const api = useWorkflowsApi();

  return useMutation<RunWorkflowResponseDto, HttpError, RunWorkflowParams & P>({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ id, inputs, metadata }) => api.runWorkflow(id, { inputs, metadata }),
    ...options,
  });
};
