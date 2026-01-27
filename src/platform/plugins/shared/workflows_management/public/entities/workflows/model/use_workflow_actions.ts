/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  RunStepCommand,
  RunWorkflowCommand,
  RunWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowListDto,
} from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

type HttpError = IHttpFetchError<ResponseErrorBody>;

export interface UpdateWorkflowParams {
  id: string;
  workflow: Partial<WorkflowDetailDto>;
}

// Context type for storing previous query data to enable rollback on mutation errors
interface OptimisticContext {
  // Map of query keys to their previous data for workflow lists
  previousData: Map<string, WorkflowListDto>;
  // Previous workflow detail data for individual workflow view
  previousWorkflowDetail?: WorkflowDetailDto;
}

export function useWorkflowActions() {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;

  const updateWorkflow = useMutation<void, HttpError, UpdateWorkflowParams, OptimisticContext>({
    mutationKey: ['PUT', 'workflows', 'id'],
    mutationFn: ({ id, workflow }: UpdateWorkflowParams) => {
      return http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
    },
    // Optimistic update: immediately update UI before server responds
    onMutate: async ({ id, workflow }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['workflows'] });

      const previousData = new Map<string, WorkflowListDto>();

      // Update all workflow list queries (e.g., different pages, filters)
      queryClient
        .getQueriesData<WorkflowListDto>({ queryKey: ['workflows'] })
        .forEach(([queryKey, data]) => {
          if (data && data.results) {
            const queryKeyString = JSON.stringify(queryKey);
            // Store previous data for rollback on error
            previousData.set(queryKeyString, data);

            // Immediately update the workflow in the list with new data
            const optimisticData: WorkflowListDto = {
              ...data,
              results: data.results.map((w) => (w.id === id ? { ...w, ...workflow } : w)),
            };

            queryClient.setQueryData(queryKey, optimisticData);
          }
        });

      // Update workflow detail query (used in YAML editor view)
      // But skip optimistic update when saving YAML, as the component manages its own state
      const previousWorkflowDetail = queryClient.getQueryData<WorkflowDetailDto>(['workflows', id]);
      if (previousWorkflowDetail && !workflow.yaml) {
        // Only optimistically update for non-YAML changes (like enabled toggle)
        // YAML updates are handled by component state and we don't want to show
        // false "Saved just now" messages when save might fail
        const optimisticWorkflowDetail: WorkflowDetailDto = {
          ...previousWorkflowDetail,
          ...workflow,
        };
        queryClient.setQueryData(['workflows', id], optimisticWorkflowDetail);
      }

      // Return previous data for potential rollback
      return { previousData, previousWorkflowDetail };
    },
    // Rollback: restore previous data if update fails
    onError: (err, variables, context) => {
      // Restore previous workflow list data
      if (context?.previousData) {
        context.previousData.forEach((data, queryKeyString) => {
          const queryKey = JSON.parse(queryKeyString);
          queryClient.setQueryData(queryKey, data);
        });
      }
      // For workflow detail, only revert if we're updating non-YAML fields (like enabled toggle)
      // If YAML was being saved, DON'T revert because the YAML editor manages its own state
      // and the component will handle showing the error and keeping the unsaved changes
      if (context?.previousWorkflowDetail && !variables.workflow.yaml) {
        // Only revert for metadata changes (like enabled toggle)
        queryClient.setQueryData(['workflows', variables.id], context.previousWorkflowDetail);
      }
      // If YAML was being saved, we intentionally don't revert the detail query
      // The component's local state keeps the YAML, and the error toast will inform the user
    },
    onSuccess: () => {
      // Refetch to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deleteWorkflows = useMutation<void, HttpError, { ids: string[] }, OptimisticContext>({
    mutationKey: ['DELETE', 'workflows'],
    mutationFn: ({ ids }: { ids: string[] }) => {
      return http.delete(`/api/workflows`, {
        body: JSON.stringify({ ids }),
      });
    },
    // Optimistic update: immediately remove workflows from UI before server responds
    onMutate: async ({ ids }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['workflows'] });

      const previousData = new Map<string, WorkflowListDto>();

      // Update all workflow list queries (e.g., different pages, filters)
      queryClient
        .getQueriesData<WorkflowListDto>({ queryKey: ['workflows'] })
        .forEach(([queryKey, data]) => {
          if (data && data.results) {
            const queryKeyString = JSON.stringify(queryKey);
            // Store previous data for rollback on error
            previousData.set(queryKeyString, data);

            // Immediately remove deleted workflows from the list and update pagination
            const optimisticData: WorkflowListDto = {
              ...data,
              results: data.results.filter((w) => !ids.includes(w.id)),
              total: data.total - ids.length,
            };

            queryClient.setQueryData(queryKey, optimisticData);
          }
        });

      // Return previous data for potential rollback
      return { previousData };
    },
    // Rollback: restore deleted workflows if deletion fails
    onError: (err, variables, context) => {
      // Restore previous workflow list data (brings back deleted workflows)
      if (context?.previousData) {
        context.previousData.forEach((data, queryKeyString) => {
          const queryKey = JSON.parse(queryKeyString);
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // Refetch to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const runWorkflow = useMutation<
    RunWorkflowResponseDto,
    HttpError,
    RunWorkflowCommand & { id: string }
  >({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ id, inputs }) => {
      return http.post(`/api/workflows/${id}/run`, {
        body: JSON.stringify({ inputs }),
      });
    },
    onSuccess: (_, { id }) => {
      // FIX: ensure workflow execution document is created at the end of the mutation
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id, 'executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });
    },
  });

  const runIndividualStep = useMutation<RunWorkflowResponseDto, HttpError, RunStepCommand>({
    mutationKey: ['POST', 'workflows', 'stepId', 'run'],
    mutationFn: ({ stepId, contextOverride, workflowYaml }) => {
      return http.post(`/api/workflows/testStep`, {
        body: JSON.stringify({ stepId, contextOverride, workflowYaml }),
      });
    },
    onSuccess: ({ workflowExecutionId }) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowExecutionId, 'executions'] });
    },
  });

  const cloneWorkflow = useMutation({
    mutationKey: ['POST', 'workflows', 'id', 'clone'],
    mutationFn: ({ id }: { id: string }) => {
      return http.post(`/api/workflows/${id}/clone`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  return {
    updateWorkflow, // kc: maybe return mutation.mutate? where the navigation is handled?
    deleteWorkflows,
    runWorkflow,
    runIndividualStep,
    cloneWorkflow,
  };
}
