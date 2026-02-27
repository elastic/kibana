/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  RunStepCommand,
  RunWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowListDto,
} from '@kbn/workflows';
import { useRunWorkflow } from '@kbn/workflows-ui';
import { useKibana } from './use_kibana';
import { useTelemetry } from './use_telemetry';

type HttpError = IHttpFetchError<ResponseErrorBody>;

export interface UpdateWorkflowParams {
  id: string;
  workflow: Partial<WorkflowDetailDto>;
  isBulkAction?: boolean;
  bulkActionCount?: number;
  /**
   * When true, the mutation will not refetch queries after a successful update.
   * Useful for bulk operations where the caller handles a single refetch at the end.
   */
  skipRefetch?: boolean;
}

interface OptimisticContext {
  previousData: Map<string, WorkflowListDto>;
  previousWorkflowDetail?: WorkflowDetailDto;
}

export const useWorkflowActions = () => {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;
  const telemetry = useTelemetry();

  const updateWorkflow = useMutation<void, HttpError, UpdateWorkflowParams, OptimisticContext>({
    mutationKey: ['PUT', 'workflows', 'id'],
    mutationFn: ({ id, workflow }: UpdateWorkflowParams) => {
      return http.put<void>(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
    },
    onMutate: async ({ id, workflow }) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] });

      const previousData = new Map<string, WorkflowListDto>();

      queryClient
        .getQueriesData<WorkflowListDto>({ queryKey: ['workflows'] })
        .forEach(([queryKey, data]) => {
          if (data && data.results) {
            const queryKeyString = JSON.stringify(queryKey);
            previousData.set(queryKeyString, data);

            const optimisticData: WorkflowListDto = {
              ...data,
              results: data.results.map((w) => (w.id === id ? { ...w, ...workflow } : w)),
            };

            queryClient.setQueryData(queryKey, optimisticData);
          }
        });

      const previousWorkflowDetail = queryClient.getQueryData<WorkflowDetailDto>(['workflows', id]);
      if (previousWorkflowDetail && !workflow.yaml) {
        const optimisticWorkflowDetail: WorkflowDetailDto = {
          ...previousWorkflowDetail,
          ...workflow,
        };
        queryClient.setQueryData(['workflows', id], optimisticWorkflowDetail);
      }

      return { previousData, previousWorkflowDetail };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, queryKeyString) => {
          const queryKey = JSON.parse(queryKeyString);
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousWorkflowDetail && !variables.workflow.yaml) {
        queryClient.setQueryData(['workflows', variables.id], context.previousWorkflowDetail);
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      telemetry.reportWorkflowUpdated({
        workflowId: variables.id,
        workflowUpdate: variables.workflow,
        hasValidationErrors: false,
        validationErrorCount: 0,
        isBulkAction: variables.isBulkAction ?? false,
        ...(variables.bulkActionCount !== undefined && {
          bulkActionCount: variables.bulkActionCount,
        }),
        origin: 'workflow_list',
        error: errorObj,
      });
    },
    onSuccess: (_, variables) => {
      telemetry.reportWorkflowUpdated({
        workflowId: variables.id,
        workflowUpdate: variables.workflow,
        hasValidationErrors: false,
        validationErrorCount: 0,
        isBulkAction: variables.isBulkAction ?? false,
        ...(variables.bulkActionCount !== undefined && {
          bulkActionCount: variables.bulkActionCount,
        }),
        origin: 'workflow_list',
        error: undefined,
      });

      queryClient.invalidateQueries({
        queryKey: ['workflows'],
        refetchType: variables.skipRefetch ? 'none' : 'active',
      });
    },
  });

  const deleteWorkflows = useMutation<void, HttpError, { ids: string[] }, OptimisticContext>({
    mutationKey: ['DELETE', 'workflows'],
    mutationFn: ({ ids }: { ids: string[] }) => {
      return http.delete(`/api/workflows`, {
        body: JSON.stringify({ ids }),
      });
    },
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: ['workflows'] });

      const previousData = new Map<string, WorkflowListDto>();

      queryClient
        .getQueriesData<WorkflowListDto>({ queryKey: ['workflows'] })
        .forEach(([queryKey, data]) => {
          if (data && data.results) {
            const queryKeyString = JSON.stringify(queryKey);
            previousData.set(queryKeyString, data);

            const optimisticData: WorkflowListDto = {
              ...data,
              results: data.results.filter((w) => !ids.includes(w.id)),
              total: data.total - ids.length,
            };

            queryClient.setQueryData(queryKey, optimisticData);
          }
        });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach((data, queryKeyString) => {
          const queryKey = JSON.parse(queryKeyString);
          queryClient.setQueryData(queryKey, data);
        });
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));
      variables.ids.forEach((workflowId) => {
        telemetry.reportWorkflowDeleted({
          workflowIds: [workflowId],
          isBulkDelete: variables.ids.length > 1,
          origin: 'workflow_list',
          error: errorObj,
        });
      });
    },
    onSuccess: (_, variables) => {
      variables.ids.forEach((workflowId) => {
        telemetry.reportWorkflowDeleted({
          workflowIds: [workflowId],
          isBulkDelete: variables.ids.length > 1,
          origin: 'workflow_list',
          error: undefined,
        });
      });

      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const runWorkflow = useRunWorkflow({
    onSuccess: (_, variables) => {
      const inputCount = Object.keys(variables.inputs || {}).length;

      telemetry.reportWorkflowRunInitiated({
        workflowId: variables.id,
        hasInputs: inputCount > 0,
        inputCount,
        origin: 'workflow_list',
        error: undefined,
        triggerTab: variables.triggerTab,
      });

      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', variables.id, 'executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', variables.id] });
    },
    onError: (err, variables) => {
      const inputCount = Object.keys(variables.inputs || {}).length;
      const errorObj = err instanceof Error ? err : new Error(String(err));

      telemetry.reportWorkflowRunInitiated({
        workflowId: variables.id,
        hasInputs: inputCount > 0,
        inputCount,
        origin: 'workflow_list',
        error: errorObj,
        triggerTab: variables.triggerTab,
      });
    },
  });

  const runIndividualStep = useMutation<RunWorkflowResponseDto, HttpError, RunStepCommand>({
    mutationKey: ['POST', 'workflows', 'stepId', 'run'],
    mutationFn: ({ stepId, contextOverride, workflowYaml }) => {
      return http.post(`/api/workflows/testStep`, {
        body: JSON.stringify({ stepId, contextOverride, workflowYaml }),
      });
    },
    onSuccess: ({ workflowExecutionId }, variables) => {
      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: variables.workflowYaml,
        stepId: variables.stepId,
        origin: 'workflow_detail',
        error: undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['workflows', workflowExecutionId, 'executions'] });
    },
    onError: (err, variables) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      telemetry.reportWorkflowStepTestRunInitiated({
        workflowYaml: variables.workflowYaml,
        stepId: variables.stepId,
        origin: 'workflow_detail',
        error: errorObj,
      });
    },
  });

  const cloneWorkflow = useMutation<WorkflowDetailDto, HttpError, { id: string }>({
    mutationKey: ['POST', 'workflows', 'id', 'clone'],
    mutationFn: ({ id }: { id: string }) => {
      return http.post<WorkflowDetailDto>(`/api/workflows/${id}/clone`);
    },
    onSuccess: (clonedWorkflow, variables) => {
      telemetry.reportWorkflowCloned({
        sourceWorkflowId: variables.id,
        newWorkflowId: clonedWorkflow.id,
        origin: 'workflow_list',
        error: undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err, variables) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      telemetry.reportWorkflowCloned({
        sourceWorkflowId: variables.id,
        origin: 'workflow_list',
        error: errorObj,
      });
    },
  });

  return {
    updateWorkflow,
    deleteWorkflows,
    runWorkflow,
    runIndividualStep,
    cloneWorkflow,
  };
};
