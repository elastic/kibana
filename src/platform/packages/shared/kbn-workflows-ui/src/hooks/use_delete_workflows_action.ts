/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMutation, type UseMutationOptions } from '@kbn/react-query';
import type { HttpError, OptimisticContext } from './types';

export interface DeleteWorkflowsActionParams {
  /** Workflow IDs to delete in a single request. */
  ids: string[];
}

/**
 * Deletes one or more workflows by ID.
 *
 * Sends `DELETE /api/workflows` with `{ ids }`.
 * Call with `{ ids }`, where `ids` is an array of workflow IDs to delete.
 *
 * @example
 * ```ts
 * const { mutate: deleteWorkflows } = useDeleteWorkflowsAction();
 *
 * deleteWorkflows({ ids: ['workflow-1', 'workflow-2'] });
 * ```
 */
export const useDeleteWorkflowsAction = (
  options?: UseMutationOptions<void, HttpError, DeleteWorkflowsActionParams, OptimisticContext>
) => {
  const { http } = useKibana().services;

  return useMutation<void, HttpError, DeleteWorkflowsActionParams, OptimisticContext>({
    mutationKey: ['DELETE', 'workflows'],
    mutationFn: ({ ids }) => {
      if (!http) {
        return Promise.reject(new Error('Http service is not available'));
      }
      return http.delete(`/api/workflows`, {
        body: JSON.stringify({ ids }),
      });
    },
    ...options,
  });
};
