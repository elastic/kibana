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
import { StepLogsSection } from './step_logs_section';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockStepExecutionDto } from '../../../shared/test_utils';

jest.mock('./step_logs_view', () => ({
  StepLogsView: () => <div data-test-subj="step-logs-view" />,
}));

describe('StepLogsSection', () => {
  const services = createStartServicesMock();
  const stepExecution = createMockStepExecutionDto({ stepType: 'remoteHost.exec' });

  const renderSection = () =>
    render(<StepLogsSection stepExecution={stepExecution} workflowExecutionId="exec-1" />, {
      wrapper: getTestProvider({ services }),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides logs when the step definition does not enable them', () => {
    (services.workflowsExtensions.getStepDefinition as jest.Mock).mockReturnValue(undefined);

    renderSection();

    expect(screen.queryByTestId('workflowExecutionStepLogs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-logs-view')).not.toBeInTheDocument();
  });

  it('renders a Logs section when the step definition enables logs', () => {
    (services.workflowsExtensions.getStepDefinition as jest.Mock).mockReturnValue({
      logs: { enabled: true },
    });

    renderSection();

    expect(screen.getByTestId('workflowExecutionStepLogs')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByTestId('step-logs-view')).toBeInTheDocument();
  });
});
