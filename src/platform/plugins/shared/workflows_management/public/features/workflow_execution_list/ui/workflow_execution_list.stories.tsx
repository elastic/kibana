/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import type { Meta, StoryObj } from '@storybook/react';
import { parseDuration } from '@kbn/workflows-execution-engine/server/utils/parse-duration/parse-duration';
import { useState } from 'react';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowExecutionList, type WorkflowExecutionListProps } from './workflow_execution_list';
import type { ExecutionListFiltersQueryParams } from './workflow_execution_list_stateful';

const WorkflowExecutionListWithState = (props: WorkflowExecutionListProps) => {
  const [filters, setFilters] = useState<ExecutionListFiltersQueryParams>({
    statuses: [],
    executionTypes: [],
  });
  return <WorkflowExecutionList {...props} filters={filters} onFiltersChange={setFilters} />;
};

const meta: Meta<typeof WorkflowExecutionList> = {
  component: WorkflowExecutionListWithState,
  title: 'Workflows Management/Workflow Execution List',
  decorators: [kibanaReactDecorator],
};

export default meta;

type Story = StoryObj<typeof WorkflowExecutionList>;

const mockFilters: WorkflowExecutionListProps['filters'] = {
  statuses: [ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.WAITING_FOR_INPUT],
  executionTypes: [ExecutionType.PRODUCTION],
};

export const Default: Story = {
  args: {
    executions: {
      results: [
        {
          id: '3',
          status: ExecutionStatus.RUNNING,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          spaceId: 'default',
          duration: parseDuration('1m28s'),
        },
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          spaceId: 'default',
          duration: parseDuration('1h2m'),
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          spaceId: 'default',
          duration: parseDuration('1d2h'),
        },
        {
          id: '4',
          status: ExecutionStatus.PENDING,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          duration: parseDuration('1w2d'),
          spaceId: 'default',
        },
        {
          id: '5',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          duration: parseDuration('1m28s'),
          spaceId: 'default',
        },
        {
          id: '6',
          status: ExecutionStatus.CANCELLED,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          duration: parseDuration('280ms'),
          spaceId: 'default',
        },
        {
          id: '7',
          status: ExecutionStatus.SKIPPED,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          duration: parseDuration('28s'),
          spaceId: 'default',
        },
      ],
      _pagination: {
        page: 1,
        limit: 10,
        total: 8,
      },
    },
    onExecutionClick: () => {},
    selectedId: '2',
  },
};

export const Empty: Story = {
  args: {
    executions: {
      results: [],
      _pagination: {
        page: 1,
        limit: 10,
        total: 0,
      },
    },
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    error: null,
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
  },
};

export const ErrorStory: Story = {
  args: {
    isLoading: false,
    error: new Error('Internal server error'),
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
  },
};
