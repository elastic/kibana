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
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { HttpError, OptimisticContext } from './types';

export interface UpdateWorkflowParams {
  /** Workflow ID to update. */
  id: string;
  workflow: Partial<WorkflowDetailDto>;
  /**
   * Optional client-only metadata used by telemetry in composed hooks.
   * Not sent to the server.
   */
  isBulkAction?: boolean;
  /** Optional number of items affected in a bulk update action. */
  bulkActionCount?: number;
}

/**
 * Updates a workflow by ID.
 *
 * Sends `PUT /api/workflows/{id}` with a partial workflow payload.
 * Call with `{ id, workflow }`, where:
 * - `id`: workflow ID to update
 * - `workflow`: what to update in the workflow
 *
 * @example
 * ```ts
 * const { mutate: updateWorkflow } = useUpdateWorkflowAction();
 *
 * updateWorkflow({
 *   id: workflowId,
 *   workflow: { enabled: false },
 * });
 * ```
 */
export const useUpdateWorkflowAction = (
  options?: UseMutationOptions<void, HttpError, UpdateWorkflowParams, OptimisticContext>
) => {
  const { http } = useKibana().services;

  return useMutation<void, HttpError, UpdateWorkflowParams, OptimisticContext>({
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
