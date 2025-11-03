/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StepExecutionTimeline } from './step_execution_timeline';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import type { WorkflowExecutionLogEntry } from '../../../entities/workflows/api/use_workflow_execution_logs';

const meta: Meta<typeof StepExecutionTimeline> = {
  component: StepExecutionTimeline,
  title: 'Workflows Management/Step Execution Timeline',
  decorators: [kibanaReactDecorator],
};

export default meta;

const mockLogs: WorkflowExecutionLogEntry[] = [
  {
    id: '1',
    timestamp: '2021-01-01',
    message: 'Step started',
    level: 'info',
  },
  {
    id: '2',
    timestamp: '2021-01-02',
    message: 'Step completed',
    level: 'info',
  },
  {
    id: '3',
    timestamp: '2021-01-03',
    message: 'Step failed',
    level: 'error',
  },
];

export const Default: StoryObj<typeof StepExecutionTimeline> = {
  args: {
    logs: mockLogs,
  },
};
