/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  NOT_READY_SENTINEL,
  WorkflowExecuteHistoricalForm,
} from './workflow_execute_historical_form';

const mockUseWorkflowExecution = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_execution', () => ({
  useWorkflowExecution: (...args: any[]) => mockUseWorkflowExecution(...args),
}));

const mockUseWorkflowExecutions = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_executions', () => ({
  useWorkflowExecutions: (...args: any[]) => mockUseWorkflowExecutions(...args),
}));

jest.mock('../../../shared/ui/use_formatted_date', () => ({
  useGetFormattedDateTime: () => (date: Date) => date.toISOString(),
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

describe('WorkflowExecuteHistoricalForm', () => {
  const defaultProps = {
    workflowId: 'workflow-1',
    value: '{}',
    setValue: jest.fn(),
    errors: null as string | null,
    setErrors: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowExecution.mockReturnValue({ data: null, isLoading: false });
    mockUseWorkflowExecutions.mockReturnValue({ data: null });
  });

  describe('rendering', () => {
    it('should render the execution combo box', () => {
      renderWithProviders(<WorkflowExecuteHistoricalForm {...defaultProps} />);
      expect(screen.getByTestId('workflowExecuteModalReplayExecutionComboBox')).toBeInTheDocument();
    });

    it('should render the select execution label', () => {
      renderWithProviders(<WorkflowExecuteHistoricalForm {...defaultProps} />);
      expect(screen.getByText('Select execution')).toBeInTheDocument();
    });
  });

  describe('not-ready signaling', () => {
    it('should set NOT_READY_SENTINEL error when no execution is selected', () => {
      renderWithProviders(<WorkflowExecuteHistoricalForm {...defaultProps} />);
      expect(defaultProps.setErrors).toHaveBeenCalledWith(NOT_READY_SENTINEL);
    });

    it('should set NOT_READY_SENTINEL error when execution is loading', () => {
      mockUseWorkflowExecution.mockReturnValue({ data: null, isLoading: true });
      renderWithProviders(
        <WorkflowExecuteHistoricalForm {...defaultProps} initialExecutionId="exec-1" />
      );
      expect(defaultProps.setErrors).toHaveBeenCalledWith(NOT_READY_SENTINEL);
    });
  });

  describe('execution loading', () => {
    it('should show loading text when execution is loading', () => {
      mockUseWorkflowExecution.mockReturnValue({ data: null, isLoading: true });
      renderWithProviders(
        <WorkflowExecuteHistoricalForm {...defaultProps} initialExecutionId="exec-1" />
      );
      expect(screen.getByText(/Loading execution/)).toBeInTheDocument();
    });
  });

  describe('execution data population', () => {
    it('should populate editor value and clear errors when execution data arrives', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: { key: 'value' }, event: { type: 'alert' } },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm {...defaultProps} initialExecutionId="exec-1" />
      );

      expect(defaultProps.setValue).toHaveBeenCalledWith(
        JSON.stringify({ key: 'value', event: { type: 'alert' } }, null, 2)
      );
      expect(defaultProps.setErrors).toHaveBeenCalledWith(null);
    });

    it('should extract only inputs when context has no event', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: { foo: 'bar' } },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm {...defaultProps} initialExecutionId="exec-1" />
      );

      expect(defaultProps.setValue).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
    });
  });

  describe('error callout', () => {
    it('should not show error callout for NOT_READY_SENTINEL', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: {} },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm
          {...defaultProps}
          initialExecutionId="exec-1"
          errors={NOT_READY_SENTINEL}
        />
      );

      expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument();
    });

    it('should show error callout for real JSON errors', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: {} },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm
          {...defaultProps}
          initialExecutionId="exec-1"
          errors="Unexpected token"
        />
      );

      expect(screen.getByText('Unexpected token')).toBeInTheDocument();
    });
  });

  describe('JSON validation on editor change', () => {
    it('should clear errors when valid JSON is entered', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: {} },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm
          {...defaultProps}
          initialExecutionId="exec-1"
          value='{"key":"value"}'
        />
      );

      const editor = screen.getByTestId('workflow-historical-json-editor');
      fireEvent.change(editor, { target: { value: '{"valid": true}' } });

      expect(defaultProps.setValue).toHaveBeenCalledWith('{"valid": true}');
      expect(defaultProps.setErrors).toHaveBeenCalledWith(null);
    });

    it('should set error when invalid JSON is entered', () => {
      const mockExecution = {
        id: 'exec-1',
        context: { inputs: {} },
      };
      mockUseWorkflowExecution.mockReturnValue({ data: mockExecution, isLoading: false });
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm
          {...defaultProps}
          initialExecutionId="exec-1"
          value='{"key":"value"}'
        />
      );

      const editor = screen.getByTestId('workflow-historical-json-editor');
      fireEvent.change(editor, { target: { value: '{invalid' } });

      expect(defaultProps.setValue).toHaveBeenCalledWith('{invalid');
      expect(defaultProps.setErrors).toHaveBeenCalledWith('Invalid JSON');
    });
  });

  describe('execution options', () => {
    it('should show execution options in combo box', () => {
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 2,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
            {
              id: 'exec-2',
              startedAt: '2024-01-02T00:00:00Z',
              isTestRun: true,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(<WorkflowExecuteHistoricalForm {...defaultProps} />);

      const comboBox = screen.getByTestId('workflowExecuteModalReplayExecutionComboBox');
      expect(comboBox).toBeInTheDocument();
    });

    it('should pre-select execution when initialExecutionId is provided', () => {
      mockUseWorkflowExecutions.mockReturnValue({
        data: {
          total: 1,
          results: [
            {
              id: 'exec-1',
              startedAt: '2024-01-01T00:00:00Z',
              isTestRun: false,
              status: ExecutionStatus.COMPLETED,
            },
          ],
        },
      });

      renderWithProviders(
        <WorkflowExecuteHistoricalForm {...defaultProps} initialExecutionId="exec-1" />
      );

      expect(mockUseWorkflowExecution).toHaveBeenCalledWith(
        expect.objectContaining({ executionId: 'exec-1', enabled: true })
      );
    });
  });
});
