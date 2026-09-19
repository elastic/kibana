/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestWrapper } from '../../../shared/test_utils';
import { useStepExecutionLogs } from '../model/use_step_execution_logs';
import { StepExecutionLogs } from './step_execution_logs';

jest.mock('../model/use_step_execution_logs', () => ({
  useStepExecutionLogs: jest.fn(),
}));

const mockUseStepExecutionLogs = useStepExecutionLogs as jest.MockedFunction<
  typeof useStepExecutionLogs
>;

describe('StepExecutionLogs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders log lines from the executions logs API', () => {
    mockUseStepExecutionLogs.mockReturnValue({
      data: {
        logs: [
          {
            id: 'log-1',
            timestamp: '2026-09-18T20:00:00.000Z',
            level: 'info',
            message: 'Retrieving alerts from .alerts-security.alerts-default',
          },
        ],
        total: 1,
        page: 1,
        size: 100,
      },
      isLoading: false,
      isError: false,
    } as any);

    render(
      <TestWrapper>
        <StepExecutionLogs workflowExecutionId="exec-1" stepExecutionId="step-1" />
      </TestWrapper>
    );

    expect(screen.getByTestId('workflowStepExecutionLogs')).toBeInTheDocument();
    expect(
      screen.getByText('Retrieving alerts from .alerts-security.alerts-default')
    ).toBeInTheDocument();
  });

  it('shows empty copy when the API returns no logs', () => {
    mockUseStepExecutionLogs.mockReturnValue({
      data: { logs: [], total: 0, page: 1, size: 100 },
      isLoading: false,
      isError: false,
    } as any);

    render(
      <TestWrapper>
        <StepExecutionLogs workflowExecutionId="exec-1" stepExecutionId="step-1" />
      </TestWrapper>
    );

    expect(screen.getByText(/No logs for this step/)).toBeInTheDocument();
  });
});
