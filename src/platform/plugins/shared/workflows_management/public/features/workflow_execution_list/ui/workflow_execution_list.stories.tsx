/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { parseDuration } from '@kbn/workflows-execution-engine/server/utils/parse-duration/parse-duration';
import { WorkflowExecutionList, type WorkflowExecutionListProps } from './workflow_execution_list';
import type { ExecutionListFiltersQueryParams } from './workflow_execution_list_stateful';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const WorkflowExecutionListWithState = (props: WorkflowExecutionListProps) => {
  const [filters, setFilters] = useState<ExecutionListFiltersQueryParams>({
    statuses: [],
    executionTypes: [],
    executedBy: [],
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
  executedBy: [],
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
          error: null,
          isTestRun: false,
          spaceId: 'default',
          duration: parseDuration('1m28s'),
          stepId: 'my_first_step',
        },
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          isTestRun: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          spaceId: 'default',
          duration: parseDuration('1h2m'),
          stepId: 'my_first_step',
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          spaceId: 'default',
          duration: parseDuration('1d2h'),
          stepId: 'my_first_step',
        },
        {
          id: '4',
          status: ExecutionStatus.PENDING,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          duration: parseDuration('1w2d'),
          spaceId: 'default',
          stepId: 'my_first_step',
        },
        {
          id: '5',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          duration: parseDuration('1m28s'),
          spaceId: 'default',
          stepId: 'my_first_step',
        },
        {
          id: '6',
          status: ExecutionStatus.CANCELLED,
          isTestRun: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          duration: parseDuration('280ms'),
          spaceId: 'default',
          stepId: 'my_first_step',
        },
        {
          id: '7',
          status: ExecutionStatus.SKIPPED,
          isTestRun: true,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          duration: parseDuration('28s'),
          spaceId: 'default',
          stepId: 'my_first_step',
        },
      ],
      page: 1,
      size: 10,
      total: 8,
    },
    isInitialLoading: false,
    isLoadingMore: false,
    onExecutionClick: () => {},
    selectedId: '2',
    setPaginationObserver: () => {},
  },
};

export const Empty: Story = {
  args: {
    executions: {
      results: [],
      page: 1,
      size: 10,
      total: 0,
    },
    isInitialLoading: false,
    isLoadingMore: false,
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
    onExecutionClick: () => {},
    setPaginationObserver: () => {},
  },
};

export const Loading: Story = {
  args: {
    isInitialLoading: true,
    isLoadingMore: false,
    error: null,
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
    onExecutionClick: () => {},
    setPaginationObserver: () => {},
  },
};

export const ErrorStory: Story = {
  args: {
    isInitialLoading: false,
    isLoadingMore: false,
    error: new Error('Internal server error'),
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
    onExecutionClick: () => {},
    setPaginationObserver: () => {},
  },
};

export const LoadingMore: Story = {
  args: {
    executions: {
      results: [
        {
          id: '1',
          status: ExecutionStatus.COMPLETED,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          spaceId: 'default',
          duration: parseDuration('1h2m'),
          stepId: 'my_first_step',
        },
        {
          id: '2',
          status: ExecutionStatus.FAILED,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          spaceId: 'default',
          duration: parseDuration('1d2h'),
          stepId: 'my_first_step',
        },
      ],
      page: 1,
      size: 10,
      total: 20,
    },
    isInitialLoading: false,
    isLoadingMore: true,
    error: null,
    selectedId: null,
    filters: mockFilters,
    onFiltersChange: () => {},
    onExecutionClick: () => {},
    setPaginationObserver: () => {},
  },
};
