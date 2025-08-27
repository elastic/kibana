/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { Meta } from '@storybook/react';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowExecutionList } from './workflow_execution_list';

const meta: Meta<typeof WorkflowExecutionList> = {
  component: WorkflowExecutionList,
  title: 'Workflows Management/Workflow Execution List',
  decorators: [kibanaReactDecorator],
};

export default meta;

export const Default = {
  args: {
    executions: {
      results: [
        {
          id: '3',
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '4',
          status: ExecutionStatus.PENDING,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '5',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '6',
          status: ExecutionStatus.CANCELLED,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: '7',
          status: ExecutionStatus.SKIPPED,
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ],
      _pagination: {
        offset: 0,
        limit: 10,
        total: 8,
      },
    },
    onExecutionClick: () => {},
    selectedId: '2',
  },
};

export const Empty = {
  args: {
    executions: {
      results: [],
      _pagination: {
        offset: 0,
        limit: 10,
        total: 0,
      },
    },
    selectedId: null,
  },
};

export const Loading = {
  args: {
    isLoading: true,
    error: null,
    selectedId: null,
  },
};

export const ErrorStory = {
  args: {
    isLoading: false,
    error: new Error('Internal server error'),
    selectedId: null,
  },
};
