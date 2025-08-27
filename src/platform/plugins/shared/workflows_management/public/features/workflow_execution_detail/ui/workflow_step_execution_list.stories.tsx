/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { Meta, StoryObj } from '@storybook/react';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowStepExecutionList } from './workflow_step_execution_list';

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
      stepExecutions: [
        {
          id: '3',
          status: ExecutionStatus.RUNNING,
          startedAt: new Date().toISOString(),
          stepId: 'step-1',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 1,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          startedAt: new Date().toISOString(),
          stepId: 'step-2',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 2,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          startedAt: new Date().toISOString(),
          stepId: 'step-3',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 3,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '4',
          status: ExecutionStatus.PENDING,
          startedAt: new Date().toISOString(),
          stepId: 'step-4',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 4,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '5',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: new Date().toISOString(),
          stepId: 'step-5',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 5,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '6',
          status: ExecutionStatus.CANCELLED,
          startedAt: new Date().toISOString(),
          stepId: 'step-6',
          workflowRunId: 'workflow-run-1',
          workflowId: 'workflow-1',
          topologicalIndex: 6,
          executionIndex: 0,
          spaceId: 'default',
        },
        {
          id: '7',
          status: ExecutionStatus.SKIPPED,
          startedAt: new Date().toISOString(),
          stepId: 'step-7',
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
