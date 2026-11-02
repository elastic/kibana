/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionList } from './workflow_execution_list';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta = {
  title: 'Workflows Management/Workflow Execution List/Workflow Execution List',
  component: WorkflowExecutionList,
  decorators: [
    kibanaReactDecorator,
    (story) => <div style={{ width: '320px', height: '480px' }}>{story()}</div>,
  ],
};

export default meta;
type Story = StoryObj<typeof WorkflowExecutionList>;

const defaultFilters = {
  statuses: [],
  executionTypes: [],
  executedBy: [],
};

const baseListProps = {
  filters: defaultFilters,
  onFiltersChange: () => undefined,
  isInitialLoading: false,
  isLoadingMore: false,
  error: null,
  onExecutionClick: () => undefined,
  selectedId: null,
  setPaginationObserver: () => undefined,
  showExecutor: true,
  canCancel: true,
  isCancelInProgress: false,
  onConfirmCancel: async () => undefined,
};

export const MixedStatuses: Story = {
  args: {
    ...baseListProps,
    executions: {
      results: [
        {
          id: 'exec-1',
          spaceId: 'default',
          status: ExecutionStatus.COMPLETED,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          error: null,
          duration: 1234,
          workflowId: 'wf-1',
          workflowName: 'Demo',
          executedBy: 'u_john_doe',
          triggeredBy: 'manual',
        },
        {
          id: 'exec-2',
          spaceId: 'default',
          status: ExecutionStatus.FAILED,
          isTestRun: true,
          startedAt: moment().subtract(2, 'days').toISOString(),
          finishedAt: moment().subtract(2, 'days').toISOString(),
          error: null,
          duration: 45000,
          workflowId: 'wf-1',
          workflowName: 'Demo',
          executedBy: 'u_mGBROF_q5bm_long_system_principal',
          triggeredBy: 'manual',
          stepId: 'analyze_alerts',
        },
        {
          id: 'exec-3',
          spaceId: 'default',
          status: ExecutionStatus.RUNNING,
          isTestRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: '',
          error: null,
          duration: null,
          workflowId: 'wf-1',
          workflowName: 'Demo',
          executedBy: 'u_john_doe',
          triggeredBy: 'scheduled',
        },
      ],
      page: 1,
      size: 100,
      total: 3,
    },
  },
};
