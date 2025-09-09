/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionStatus } from '@kbn/workflows';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowStepExecutionListItem } from './workflow_step_execution_list_item';

const meta: Meta = {
  title: 'Workflows Management/Step Execution List/List Item',
  component: WorkflowStepExecutionListItem,
  decorators: [kibanaReactDecorator],
};

export default meta;

type Story = StoryObj<typeof WorkflowStepExecutionListItem>;

export const Default: Story = {
  args: {
    stepExecution: {
      id: '1',
      stepId: 'step-1',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2021-01-01T00:00:00.000Z',
      executionTimeMs: 1000,
      workflowId: 'workflow-1',
      workflowRunId: 'workflow-run-1',
      topologicalIndex: 1,
      executionIndex: 0,
      spaceId: 'default',
      path: [],
    },
  },
};

export const Running: Story = {
  args: {
    stepExecution: {
      id: '1',
      stepId: 'step-1',
      status: ExecutionStatus.RUNNING,
      startedAt: '2021-01-01T00:00:00.000Z',
      executionTimeMs: 1000,
      workflowId: 'workflow-1',
      workflowRunId: 'workflow-run-1',
      topologicalIndex: 1,
      executionIndex: 0,
      spaceId: 'default',
      path: [],
    },
  },
};

export const Failed: Story = {
  args: {
    stepExecution: {
      id: '1',
      stepId: 'step-1',
      status: ExecutionStatus.FAILED,
      startedAt: '2021-01-01T00:00:00.000Z',
      executionTimeMs: 1000,
      workflowId: 'workflow-1',
      workflowRunId: 'workflow-run-1',
      topologicalIndex: 1,
      executionIndex: 0,
      spaceId: 'default',
      path: [],
    },
  },
};
