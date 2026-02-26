/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQueryClient } from '@kbn/react-query';
import type { WorkflowDetailDto, WorkflowListDto } from '@kbn/workflows';
import { useRunWorkflow } from '@kbn/workflows-ui';
import { useCloneWorkflow } from './use_clone_workflow';
import { useDeleteWorkflows } from './use_delete_workflows';
import { useRunWorkflowStep } from './use_run_workflow_step';
import { useTelemetry } from './use_telemetry';
import { useUpdateWorkflow } from './use_update_workflow';

export const useWorkflowActions = () => {
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();

  const updateWorkflow = useUpdateWorkflow({
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
      telemetry?.reportWorkflowUpdated({
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
      telemetry?.reportWorkflowUpdated({
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

  const deleteWorkflows = useDeleteWorkflows({
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
        telemetry?.reportWorkflowDeleted({
          workflowIds: [workflowId],
          isBulkDelete: variables.ids.length > 1,
          origin: 'workflow_list',
          error: errorObj,
        });
      });
    },
    onSuccess: (_, variables) => {
      variables.ids.forEach((workflowId) => {
        telemetry?.reportWorkflowDeleted({
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

      telemetry?.reportWorkflowRunInitiated({
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

      telemetry?.reportWorkflowRunInitiated({
        workflowId: variables.id,
        hasInputs: inputCount > 0,
        inputCount,
        origin: 'workflow_list',
        error: errorObj,
        triggerTab: variables.triggerTab,
      });
    },
  });

  const runIndividualStep = useRunWorkflowStep({
    onSuccess: ({ workflowExecutionId }, variables) => {
      telemetry?.reportWorkflowStepTestRunInitiated({
        workflowYaml: variables.workflowYaml,
        stepId: variables.stepId,
        origin: 'workflow_detail',
        error: undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['workflows', workflowExecutionId, 'executions'] });
    },
    onError: (err, variables) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      telemetry?.reportWorkflowStepTestRunInitiated({
        workflowYaml: variables.workflowYaml,
        stepId: variables.stepId,
        origin: 'workflow_detail',
        error: errorObj,
      });
    },
  });

  const cloneWorkflow = useCloneWorkflow({
    onSuccess: (clonedWorkflow, variables) => {
      telemetry?.reportWorkflowCloned({
        sourceWorkflowId: variables.id,
        newWorkflowId: clonedWorkflow.id,
        origin: 'workflow_list',
        error: undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err, variables) => {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      telemetry?.reportWorkflowCloned({
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
