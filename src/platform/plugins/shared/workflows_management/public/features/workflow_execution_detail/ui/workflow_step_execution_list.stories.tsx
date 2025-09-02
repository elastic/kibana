/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { Meta, StoryObj } from '@storybook/react';
import type { SafeParseReturnType } from '@kbn/zod';
import { parseWorkflowYamlToJSON } from '../../../../common/lib/yaml_utils';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../../common/schema';
import { WorkflowStepExecutionList } from './workflow_step_execution_list';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta<typeof WorkflowStepExecutionList> = {
  component: WorkflowStepExecutionList,
  title: 'Workflows Management/Step Execution List',
  decorators: [kibanaReactDecorator],
};

export default meta;

export const Default: StoryObj<typeof WorkflowStepExecutionList> = {
  args: {
    execution: {
      id: '1',
      status: ExecutionStatus.COMPLETED,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      duration: 1000,
      spaceId: 'default',
      yaml: '',
      stepExecutions: [
        {
          id: '3',
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(Date.now() - 1000).toISOString(),
          completedAt: new Date(Date.now() - 100).toISOString(),
          stepId: 'new_alert_slack',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 1,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          startedAt: new Date(Date.now() - 2000).toISOString(),
          completedAt: new Date().toISOString(),
          stepId: 'check_ip',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 2,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          startedAt: new Date(Date.now() - 3000).toISOString(),
          completedAt: new Date(Date.now() - 2000).toISOString(),
          stepId: 'analysis_check_if_malicious',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 3,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '4',
          status: ExecutionStatus.PENDING,
          startedAt: new Date(Date.now() - 4000).toISOString(),
          completedAt: new Date(Date.now() - 3000).toISOString(),
          stepId: 'send_malicious_result_to_slack',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 4,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '5',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: new Date(Date.now() - 5000).toISOString(),
          completedAt: new Date(Date.now() - 4000).toISOString(),
          stepId: 'add_note',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 5,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '6',
          status: ExecutionStatus.CANCELLED,
          startedAt: new Date(Date.now() - 6000).toISOString(),
          completedAt: new Date(Date.now() - 5000).toISOString(),
          stepId: 'summarize_with_ai',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 6,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '7',
          status: ExecutionStatus.SKIPPED,
          startedAt: new Date(Date.now() - 7000).toISOString(),
          completedAt: new Date(Date.now() - 6000).toISOString(),
          stepId: 'debug_ai_response',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 7,
          executionIndex: 0,
          spaceId: 'default',
        },
      ],
    },
    onStepExecutionClick: () => {},
    selectedId: '2',
  },
};

export const Empty = {
  args: {
    execution: {
      id: '1',
      status: ExecutionStatus.COMPLETED,
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 1000,
      stepExecutions: [],
    },
  },
};

export const Loading: StoryObj<typeof WorkflowStepExecutionList> = {
  args: {
    isLoading: true,
    error: null,
    selectedId: null,
  },
};

export const ErrorStory: StoryObj<typeof WorkflowStepExecutionList> = {
  args: {
    isLoading: false,
    error: new Error('Internal server error'),
    selectedId: null,
  },
};

const workflowYaml = `
name: Loop Test
enabled: true
triggers:
  - type: manual
inputs:
  - name: say-hi
    type: boolean
    default: true
steps:
  - name: if
    type: if
    condition: 'inputs.say-hi: true'
    steps:
    - name: foreach
      type: foreach
      foreach: '[1, 2, 3]'
      steps:
        - name: hi
          type: console
          with:
            message: hey {{foreach.item}}
    else:
      - name: bye
        type: console
        with:
          message: sorry, no hi today
`;
const result = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
const definition = (result as SafeParseReturnType<WorkflowYaml, WorkflowYaml>).data;

export const Loop: StoryObj<typeof WorkflowStepExecutionList> = {
  args: {
    execution: {
      id: '1',
      status: ExecutionStatus.COMPLETED,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      duration: 1000,
      workflowDefinition: definition!,
      yaml: workflowYaml,
      stepExecutions: [
        {
          stepId: 'if',
          topologicalIndex: 0,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T17:19:26.144Z',
          id: '17a832c6-8b55-4e93-af4b-666835406499',
          executionIndex: 0,
          workflowRunId: '4245d981-80fe-4861-9cbc-59241cc5c246',
          workflowId: 'd6f9ddf8-c14e-4939-9752-9a67db5ba655',
          completedAt: '2025-09-02T17:19:32.477Z',
          executionTimeMs: 6333,
          spaceId: 'default',
        },
        {
          stepId: 'foreach',
          topologicalIndex: 2,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T17:19:27.338Z',
          id: '0006ff39-4c9d-40db-90cb-05aafa2c300a',
          executionIndex: 0,
          workflowRunId: '4245d981-80fe-4861-9cbc-59241cc5c246',
          workflowId: 'd6f9ddf8-c14e-4939-9752-9a67db5ba655',
          state: {
            item: 3,
            total: 3,
            index: 2,
            items: [1, 2, 3],
          },
          completedAt: '2025-09-02T17:19:31.426Z',
          executionTimeMs: 4088,
          spaceId: 'default',
        },
        {
          stepId: 'hi',
          topologicalIndex: 3,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T17:19:28.326Z',
          id: 'bdc56199-279f-42a6-8d13-0ecbcbe2a1e1',
          executionIndex: 0,
          workflowRunId: '4245d981-80fe-4861-9cbc-59241cc5c246',
          workflowId: 'd6f9ddf8-c14e-4939-9752-9a67db5ba655',
          output: 'hey 1',
          input: {
            message: 'hey 1',
          },
          completedAt: '2025-09-02T17:19:28.356Z',
          executionTimeMs: 30,
          spaceId: 'default',
        },
        {
          stepId: 'hi',
          topologicalIndex: 3,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T17:19:29.435Z',
          id: '13dfc949-0623-4206-8399-99ba904e63c8',
          executionIndex: 1,
          workflowRunId: '4245d981-80fe-4861-9cbc-59241cc5c246',
          workflowId: 'd6f9ddf8-c14e-4939-9752-9a67db5ba655',
          output: 'hey 2',
          input: {
            message: 'hey 2',
          },
          completedAt: '2025-09-02T17:19:29.462Z',
          executionTimeMs: 27,
          spaceId: 'default',
        },
        {
          stepId: 'hi',
          topologicalIndex: 3,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T17:19:30.453Z',
          id: '6e34560d-423d-410e-aa2c-61436178622d',
          executionIndex: 2,
          workflowRunId: '4245d981-80fe-4861-9cbc-59241cc5c246',
          workflowId: 'd6f9ddf8-c14e-4939-9752-9a67db5ba655',
          output: 'hey 3',
          input: {
            message: 'hey 3',
          },
          completedAt: '2025-09-02T17:19:30.479Z',
          executionTimeMs: 26,
          spaceId: 'default',
        },
      ],
      spaceId: 'default',
    },
    selectedId: 'bdc56199-279f-42a6-8d13-0ecbcbe2a1e1',
    onStepExecutionClick: () => {},
  },
};
