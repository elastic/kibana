/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CreateWorkflowCommand,
  EsWorkflow,
  RunWorkflowCommand,
  WorkflowDetailDto,
  RunWorkflowResponseDto,
  RunStepCommand,
  TestWorkflowResponseDto,
  TestWorkflowCommand,
} from '@kbn/workflows';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function useWorkflowActions() {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;

  const createWorkflow = useMutation<WorkflowDetailDto, Error, CreateWorkflowCommand>({
    networkMode: 'always',
    mutationKey: ['POST', 'workflows'],
    mutationFn: (workflow) => {
      return http!.post('/api/workflows', {
        body: JSON.stringify(workflow),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const updateWorkflow = useMutation({
    mutationKey: ['PUT', 'workflows', 'id'],
    mutationFn: ({ id, workflow }: { id: string; workflow: Partial<EsWorkflow> }) => {
      return http!.put(`/api/workflows/${id}`, {
        body: JSON.stringify(workflow),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deleteWorkflows = useMutation({
    mutationKey: ['DELETE', 'workflows'],
    mutationFn: ({ ids }: { ids: string[] }) => {
      return http!.delete(`/api/workflows`, {
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const runWorkflow = useMutation<
    RunWorkflowResponseDto,
    Error,
    RunWorkflowCommand & { id: string }
  >({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ id, inputs }) => {
      return http!.post(`/api/workflows/${id}/run`, {
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

  const runIndividualStep = useMutation<RunWorkflowResponseDto, Error, RunStepCommand>({
    mutationKey: ['POST', 'workflows', 'stepId', 'run'],
    mutationFn: ({ stepId, contextOverride, workflowYaml }) => {
      return http!.post(`/api/workflows/testStep`, {
        body: JSON.stringify({ stepId, contextOverride, workflowYaml }),
      });
    },
    onSuccess: ({ workflowExecutionId }, {}) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowExecutionId, 'executions'] });
    },
  });

  const cloneWorkflow = useMutation({
    mutationKey: ['POST', 'workflows', 'id', 'clone'],
    mutationFn: ({ id }: { id: string }) => {
      return http!.post(`/api/workflows/${id}/clone`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const testWorkflow = useMutation<TestWorkflowResponseDto, Error, TestWorkflowCommand>({
    mutationKey: ['POST', 'workflows', 'test'],
    mutationFn: ({
      workflowYaml,
      inputs,
    }: {
      workflowYaml: string;
      inputs: Record<string, any>;
    }) => {
      return http!.post(`/api/workflows/test`, {
        body: JSON.stringify({ workflowYaml, inputs }),
      });
    },
  });

  return {
    createWorkflow,
    updateWorkflow, // kc: maybe return mutation.mutate? where the navigation is handled?
    deleteWorkflows,
    runWorkflow,
    runIndividualStep,
    cloneWorkflow,
    testWorkflow,
  };
}
