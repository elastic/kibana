/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionStatus } from '@kbn/workflows';
import { MemoryRouter } from 'react-router-dom';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowStepExecutionFlyout } from './workflow_step_execution_flyout';

const meta: Meta<typeof WorkflowStepExecutionFlyout> = {
  component: WorkflowStepExecutionFlyout,
  title: 'Workflows Management/Step Execution Flyout',
  decorators: [kibanaReactDecorator, (story) => <MemoryRouter>{story()}</MemoryRouter>],
};

export default meta;

export const Default: StoryObj<typeof WorkflowStepExecutionFlyout> = {
  args: {
    stepExecution: {
      stepId: 'check_ip',
      topologicalIndex: 1,
      status: ExecutionStatus.FAILED,
      startedAt: '2025-09-01T17:34:54.542Z',
      id: 'd5c942d5-c788-46ce-961d-5dbab6cf1246',
      scopeStack: [],
      stepExecutionIndex: 0,
      globalExecutionIndex: 0,
      workflowRunId: 'e2387d33-d626-42f0-a402-c379d4d30d42',
      workflowId: 'e484eac2-f8ea-4e5b-8e80-0df74f2c42c6',
      input: {
        headers: {
          Key: '1f8a75facabe201fce55d2ba9f655b86fcbafe5923d6d75006463a616db6eca035496555c6bddd8d',
        },
        method: 'GET',
        url: 'https://api.abuseipdb.com/api/v2/check?ipAddress=',
        timeout: 30000,
      },
      completedAt: '2025-09-01T17:34:54.965Z',
      executionTimeMs: 423,
      error: 'HTTP Error: 422 Unprocessable Entity',
    },
    closeFlyout: () => {},
    goNext: () => {},
    goPrevious: () => {},
    setSelectedStepId: () => {},
    isLoading: false,
    workflowExecutionId: 'e2387d33-d626-42f0-a402-c379d4d30d42',
    stepExecutionId: 'd5c942d5-c788-46ce-961d-5dbab6cf1246',
  },
};
