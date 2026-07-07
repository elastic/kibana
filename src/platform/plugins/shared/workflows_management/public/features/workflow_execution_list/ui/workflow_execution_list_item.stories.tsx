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
import { WorkflowExecutionListItem } from './workflow_execution_list_item';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta = {
  title: 'Workflows Management/Workflow Execution List/Workflow Execution List Item',
  component: WorkflowExecutionListItem,
  decorators: [kibanaReactDecorator, (story) => <div style={{ width: '275px' }}>{story()}</div>],
};

export default meta;
type Story = StoryObj<typeof WorkflowExecutionListItem>;

export const Completed: Story = {
  args: {
    status: ExecutionStatus.COMPLETED,
    startedAt: new Date(),
    executedBy: 'john.doe@example.com',
    triggeredBy: 'manual',
  },
};

// Regression story for elastic/kibana#275866: a completed execution that finished
// a few days ago but crosses the calendar-month boundary. Before the fix this
// rendered "1 month ago"; after, "N days ago" / "N weeks ago".
export const CompletedRecentPrevMonth: Story = {
  args: {
    status: ExecutionStatus.COMPLETED,
    startedAt: moment().startOf('month').subtract(6, 'days').toDate(),
    executedBy: 'john.doe@example.com',
    triggeredBy: 'manual',
  },
};

export const Failed: Story = {
  args: {
    status: ExecutionStatus.FAILED,
    startedAt: new Date(),
    executedBy: 'jane.smith@example.com',
    triggeredBy: 'manual',
  },
};

export const Pending: Story = {
  args: {
    status: ExecutionStatus.PENDING,
    startedAt: new Date(),
  },
};

export const Running: Story = {
  args: {
    status: ExecutionStatus.RUNNING,
    startedAt: new Date(),
  },
};

export const WaitingForInput: Story = {
  args: {
    status: ExecutionStatus.WAITING_FOR_INPUT,
    startedAt: new Date(),
  },
};

export const Cancelled: Story = {
  args: {
    status: ExecutionStatus.CANCELLED,
    startedAt: new Date(),
  },
};

export const Skipped: Story = {
  args: {
    status: ExecutionStatus.SKIPPED,
    startedAt: new Date(),
  },
};

export const Selected: Story = {
  args: {
    status: ExecutionStatus.COMPLETED,
    startedAt: new Date(),
    executedBy: 'admin@example.com',
    triggeredBy: 'scheduled',
    selected: true,
  },
};

export const RunningSelected: Story = {
  args: {
    status: ExecutionStatus.RUNNING,
    startedAt: new Date(),
    executedBy: 'system',
    triggeredBy: 'scheduled',
    selected: true,
  },
};

export const WaitingForInputSelected: Story = {
  args: {
    status: ExecutionStatus.WAITING_FOR_INPUT,
    startedAt: new Date(),
    selected: true,
  },
};
