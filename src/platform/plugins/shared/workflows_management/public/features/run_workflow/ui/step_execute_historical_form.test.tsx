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
import { I18nProvider } from '@kbn/i18n-react';
import { NOT_READY_SENTINEL, StepExecuteHistoricalForm } from './step_execute_historical_form';

const mockUseWorkflowStepExecutions = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_step_executions', () => ({
  useWorkflowStepExecutions: (...args: unknown[]) => mockUseWorkflowStepExecutions(...args),
}));

const mockUseStepExecution = jest.fn();
jest.mock('../../workflow_execution_detail/model/use_step_execution', () => ({
  useStepExecution: (...args: unknown[]) => mockUseStepExecution(...args),
}));

jest.mock('../../../shared/ui/use_formatted_date', () => ({
  useGetFormattedDateTime: () => (date: Date) => date.toISOString(),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    dataTestSubj,
  }: {
    value: string;
    onChange: (v: string) => void;
    dataTestSubj: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('StepExecuteHistoricalForm', () => {
  const defaultProps = {
    value: '{}',
    setValue: jest.fn(),
    errors: null as string | null,
    setErrors: jest.fn(),
    stepId: 'my_step',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      const s = String(selector);
      if (s.includes('selectWorkflowId')) return 'workflow-1';
      return null;
    });
    mockUseStepExecution.mockReturnValue({ data: null, isLoading: false });
    mockUseWorkflowStepExecutions.mockReturnValue({ data: undefined });
  });

  describe('rendering', () => {
    it('should render the step execution combo box', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(
        screen.getByTestId('workflowTestStepModalReplayExecutionComboBox')
      ).toBeInTheDocument();
    });

    it('should render the select step execution label', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(screen.getByText('Select step execution')).toBeInTheDocument();
    });
  });

  describe('not-ready signaling', () => {
    it('should set NOT_READY_SENTINEL when no step execution is selected', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(defaultProps.setErrors).toHaveBeenCalledWith(NOT_READY_SENTINEL);
    });

    it('should set NOT_READY_SENTINEL when step execution is loading', () => {
      mockUseStepExecution.mockReturnValue({ data: null, isLoading: true });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(defaultProps.setErrors).toHaveBeenCalledWith(NOT_READY_SENTINEL);
    });
  });

  describe('execution options', () => {
    it('should show combo box when step executions list is provided', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      const comboBox = screen.getByTestId('workflowTestStepModalReplayExecutionComboBox');
      expect(comboBox).toBeInTheDocument();
    });
  });

  describe('step execution loaded', () => {
    it('should show code editor when step execution data is available', () => {
      mockUseStepExecution.mockReturnValue({
        data: { input: { key: 'value' } },
        isLoading: false,
      });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(screen.getByTestId('workflow-test-step-historical-json-editor')).toBeInTheDocument();
    });

    it('should call setValue with formatted input when step execution loads', () => {
      mockUseStepExecution.mockReturnValue({
        data: { input: { foo: 'bar' } },
        isLoading: false,
      });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(defaultProps.setValue).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
    });

    it('should wrap non-object input in a value property', () => {
      mockUseStepExecution.mockReturnValue({
        data: { input: 'raw-string' },
        isLoading: false,
      });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(defaultProps.setValue).toHaveBeenCalledWith(
        JSON.stringify({ value: 'raw-string' }, null, 2)
      );
    });
  });

  describe('loading state', () => {
    it('should show loading text when step execution is loading', () => {
      mockUseStepExecution.mockReturnValue({ data: null, isLoading: true });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(screen.getByText(/Loading step execution/)).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should not show error callout when errors is NOT_READY_SENTINEL', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm {...defaultProps} errors={NOT_READY_SENTINEL} />
      );
      expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
    });

    it('should show error callout when there is a real error and execution is selected', () => {
      mockUseStepExecution.mockReturnValue({
        data: { input: { key: 'value' } },
        isLoading: false,
      });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt: '2024-01-01T00:00:00Z',
              status: 'completed',
            },
          ],
        },
      });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          errors="Invalid JSON"
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(screen.getAllByText('Invalid JSON').length).toBeGreaterThanOrEqual(1);
    });
  });
});
