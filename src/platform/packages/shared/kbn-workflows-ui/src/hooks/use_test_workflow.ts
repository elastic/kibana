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
import type { TestWorkflowResponseDto } from '@kbn/workflows';
import type { TestWorkflowParams } from '../api/types';
import { useWorkflowsApi } from '../api/use_workflows_api';

type HttpError = IHttpFetchError<ResponseErrorBody>;

/** Runs a test execution (saved workflow YAML, including disabled workflows). */
export const useTestWorkflow = (
  options?: UseMutationOptions<TestWorkflowResponseDto, HttpError, TestWorkflowParams>
) => {
  const api = useWorkflowsApi();

  return useMutation<TestWorkflowResponseDto, HttpError, TestWorkflowParams>({
    mutationKey: ['POST', 'workflows', 'test'],
    mutationFn: (params) => api.testWorkflow(params),
    ...options,
  });
};
