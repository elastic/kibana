/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { NOT_READY_SENTINEL, StepExecuteHistoricalForm } from './step_execute_historical_form';
import { selectWorkflowId } from '../../../entities/workflows/store';

const mockUseWorkflowStepExecutions = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_step_executions', () => ({
  useWorkflowStepExecutions: (...args: unknown[]) => mockUseWorkflowStepExecutions(...args),
}));

const mockUseStepExecution = jest.fn();
jest.mock('../../workflow_execution_detail/model/use_step_execution', () => ({
  useStepExecution: (...args: unknown[]) => mockUseStepExecution(...args),
}));

const mockUseWorkflowExecution = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_execution', () => ({
  useWorkflowExecution: (...args: unknown[]) => mockUseWorkflowExecution(...args),
}));

const mockBuildContextOverrideFromExecution = jest.fn();
jest.mock('../../../shared/utils/build_step_context_override/build_step_context_override', () => ({
  buildContextOverrideFromExecution: (...args: unknown[]) =>
    mockBuildContextOverrideFromExecution(...args),
}));

jest.mock('../../../shared/ui/use_formatted_date', () => ({
  useGetFormattedDateTime: () => (date: Date) => date.toISOString(),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
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
    setExecutionContext: jest.fn(),
    setValue: jest.fn(),
    errors: null as string | null,
    warnings: null as string | null,
    setErrors: jest.fn(),
    stepId: 'my_step',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectWorkflowId) return 'workflow-1';
      return null;
    });
    mockUseStepExecution.mockReturnValue({ data: null, isLoading: false });
    mockUseWorkflowExecution.mockReturnValue({ data: null, isLoading: false });
    mockUseWorkflowStepExecutions.mockReturnValue({ data: undefined, isLoading: false });
    mockBuildContextOverrideFromExecution.mockReturnValue({ stepContext: {} });
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

    it('should render the time range picker', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(screen.getByTestId('workflowTestStepModalReplayTimeRange')).toBeInTheDocument();
    });

    it('should pass last week default time range to useWorkflowStepExecutions', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(mockUseWorkflowStepExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-1',
          stepId: 'my_step',
          size: 100,
          startedAfter: 'now-1w',
          startedBefore: 'now',
        })
      );
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
        data: { id: 'step-exec-1', input: { key: 'value' } },
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

    it('should call setValue with context override when step execution and workflow execution load', () => {
      const mockStepExecution = { id: 'step-exec-1', input: { foo: 'bar' } };
      const mockWorkflowExec = { id: 'run-1' };
      const mockGraph = { nodes: [] };

      mockUseStepExecution.mockReturnValue({
        data: mockStepExecution,
        isLoading: false,
      });
      mockUseWorkflowExecution.mockReturnValue({
        data: mockWorkflowExec,
        isLoading: false,
      });
      mockBuildContextOverrideFromExecution.mockReturnValue({
        stepContext: { foo: 'bar' },
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
          workflowGraph={mockGraph as any}
        />
      );
      expect(mockBuildContextOverrideFromExecution).toHaveBeenCalledWith(
        mockGraph,
        mockWorkflowExec,
        mockStepExecution
      );
      expect(defaultProps.setValue).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
    });

    it('should not call setValue when workflowGraph is not provided', () => {
      mockUseStepExecution.mockReturnValue({
        data: { id: 'step-exec-1', input: { foo: 'bar' } },
        isLoading: false,
      });
      mockUseWorkflowExecution.mockReturnValue({
        data: { id: 'run-1' },
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
      expect(mockBuildContextOverrideFromExecution).not.toHaveBeenCalled();
      expect(defaultProps.setValue).not.toHaveBeenCalled();
    });

    it('should preserve initial step execution selection while waiting to anchor the date range', () => {
      // Step executions list is empty (initial step falls outside the default window) and
      // the step execution data has no `startedAt`, so the anchoring effect returns early.
      // `needsInitialExecutionDate` stays true and the reset effect must preserve the
      // initial selection while we wait for the date range to be anchored.
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { total: 0, results: [] },
      });
      mockUseStepExecution.mockReturnValue({
        data: { id: 'step-exec-1' },
        isLoading: false,
      });
      mockUseWorkflowExecution.mockReturnValue({
        data: { id: 'run-1', context: {} },
        isLoading: false,
      });
      mockBuildContextOverrideFromExecution.mockReturnValue({ stepContext: {} });

      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
          workflowGraph={{ nodes: [] } as any}
        />
      );

      // Initial workflow run id and step execution id are preserved on the step-execution hook
      expect(mockUseStepExecution).toHaveBeenCalledWith('run-1', 'step-exec-1', undefined);
      // Editor still renders because the initial selection was not cleared
      expect(screen.getByTestId('workflow-test-step-historical-json-editor')).toBeInTheDocument();
    });

    it('should clear initial selection after date range is anchored if it is missing from the list', async () => {
      const startedAt = '2024-06-01T12:00:00.000Z';
      // Step execution data exposes `startedAt`, so the anchoring effect fires and flips
      // `needsInitialExecutionDate` to false. The step executions list still does not
      // contain the initial step (mock returns empty regardless of the anchored range),
      // so the reset effect must then clear both workflow run id and step execution id.
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { total: 0, results: [] },
      });
      mockUseStepExecution.mockReturnValue({
        data: { id: 'step-exec-1', startedAt },
        isLoading: false,
      });
      mockUseWorkflowExecution.mockReturnValue({
        data: { id: 'run-1', context: {} },
        isLoading: false,
      });
      mockBuildContextOverrideFromExecution.mockReturnValue({ stepContext: {} });

      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
          workflowGraph={{ nodes: [] } as any}
        />
      );

      await waitFor(() => {
        expect(mockUseStepExecution).toHaveBeenCalledWith('', undefined, undefined);
      });
      // Once IDs are cleared, the editor visibility predicate
      // (`selectedStepExecution.id === selectedStepExecutionId`) no longer holds.
      expect(
        screen.queryByTestId('workflow-test-step-historical-json-editor')
      ).not.toBeInTheDocument();
    });

    it('should anchor time range from initial step execution startedAt when replaying', async () => {
      const startedAt = '2024-06-01T12:00:00.000Z';
      mockUseStepExecution.mockReturnValue({
        data: { id: 'step-exec-1', input: {}, startedAt },
        isLoading: false,
      });
      mockUseWorkflowExecution.mockReturnValue({
        data: { id: 'run-1', context: {} },
        isLoading: false,
      });
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'step-exec-1',
              workflowRunId: 'run-1',
              startedAt,
              status: 'completed',
            },
          ],
        },
      });
      mockBuildContextOverrideFromExecution.mockReturnValue({ stepContext: {} });

      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
          workflowGraph={{ nodes: [] } as any}
        />
      );

      await waitFor(() => {
        const calls = mockUseWorkflowStepExecutions.mock.calls.map((c) => c[0]);
        expect(
          calls.some(
            (arg) =>
              arg.startedBefore === startedAt &&
              typeof arg.startedAfter === 'string' &&
              arg.startedAfter.startsWith('2024-05-25')
          )
        ).toBe(true);
      });
    });
  });

  describe('loading state', () => {
    it('should show loading selector when step executions are loading', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({ data: undefined, isLoading: true });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} />);
      expect(
        screen
          .getByTestId('workflowTestStepModalReplayExecutionComboBox')
          .querySelector('.euiLoadingSpinner')
      ).toBeInTheDocument();
    });

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
        isLoading: false,
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

    it('should show loading text when workflow execution is loading', () => {
      mockUseWorkflowExecution.mockReturnValue({ data: null, isLoading: true });
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
        isLoading: false,
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

  describe('no selection body', () => {
    it('should show select historical message when the selected step is not in the current list', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { total: 0, results: [] },
      });
      mockUseStepExecution.mockReturnValue({ data: null, isLoading: true });
      renderWithProviders(
        <StepExecuteHistoricalForm
          {...defaultProps}
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(
        screen.queryByTestId('workflow-test-step-historical-json-editor')
      ).not.toBeInTheDocument();
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
        data: { id: 'step-exec-1', input: { key: 'value' } },
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

  describe('warnings display', () => {
    it('should show warnings callout when warnings is provided', () => {
      mockUseStepExecution.mockReturnValue({
        data: { id: 'step-exec-1', input: { key: 'value' } },
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
          warnings="requiredField: Required"
          initialStepExecutionId="step-exec-1"
          initialWorkflowRunId="run-1"
        />
      );
      expect(screen.getByTestId('workflow-input-warnings-callout')).toBeInTheDocument();
      expect(screen.getByText('Input data does not match the expected shape')).toBeInTheDocument();
      expect(screen.getByText('requiredField: Required')).toBeInTheDocument();
    });

    it('should not show warnings callout when warnings is null', () => {
      mockUseWorkflowStepExecutions.mockReturnValue({
        data: { results: [], total: 0 },
      });
      renderWithProviders(<StepExecuteHistoricalForm {...defaultProps} warnings={null} />);
      expect(screen.queryByTestId('workflow-input-warnings-callout')).not.toBeInTheDocument();
    });
  });
});
