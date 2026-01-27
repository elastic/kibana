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
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionPanel } from './workflow_execution_panel';
import { TestWrapper } from '../../../shared/test_utils';

// Mock child components
jest.mock('./cancel_execution_button', () => ({
  CancelExecutionButton: ({ executionId }: { executionId: string }) => (
    <div data-test-subj="cancel-execution-button">
      {'Cancel Execution'} {executionId}
    </div>
  ),
}));

jest.mock('./workflow_step_execution_tree', () => ({
  WorkflowStepExecutionTree: ({
    definition,
    execution,
    error,
    onStepExecutionClick,
    selectedId,
  }: {
    definition: WorkflowYaml | null;
    execution: WorkflowExecutionDto | null;
    error: Error | null;
    onStepExecutionClick: (stepExecutionId: string) => void;
    selectedId: string | null;
  }) => (
    <div data-test-subj="workflow-step-execution-tree">
      <div data-test-subj="tree-definition">{definition ? 'Has Definition' : 'No Definition'}</div>
      <div data-test-subj="tree-execution">
        {execution ? `Execution: ${execution.id}` : 'No Execution'}
      </div>
      <div data-test-subj="tree-error">{error ? `Error: ${error.message}` : 'No Error'}</div>
      <div data-test-subj="tree-selected-id">{selectedId || 'No Selection'}</div>
      <button
        type="button"
        data-test-subj="mock-step-click"
        onClick={() => onStepExecutionClick('step-123')}
      >
        {'Click Step'}
      </button>
    </div>
  ),
}));

describe('WorkflowExecutionPanel', () => {
  const mockExecution: WorkflowExecutionDto = {
    id: 'exec-123',
    isTestRun: false,
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    error: null,
    startedAt: '2024-01-01T10:00:00Z',
    finishedAt: '',
    workflowId: 'workflow-123',
    workflowName: 'Test Workflow',
    workflowDefinition: {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [],
      steps: [],
    },
    stepExecutions: [],
    duration: 5000,
    yaml: 'version: "1"\nname: Test Workflow',
  };

  const mockDefinition: WorkflowYaml = {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  };

  const defaultProps = {
    execution: mockExecution,
    definition: mockDefinition,
    error: null,
    onStepExecutionClick: jest.fn(),
    selectedId: null,
    showBackButton: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <TestWrapper>
        <WorkflowExecutionPanel {...defaultProps} {...props} />
      </TestWrapper>
    );
  };

  describe('rendering', () => {
    it('should render the component with execution data', () => {
      renderComponent();
      expect(screen.getByTestId('workflow-step-execution-tree')).toBeInTheDocument();
    });

    it('should render with null execution', () => {
      renderComponent({ execution: null });
      expect(screen.getByText('No Execution')).toBeInTheDocument();
    });

    it('should render with null definition', () => {
      renderComponent({ definition: null });
      expect(screen.getByText('No Definition')).toBeInTheDocument();
    });

    it('should render with error', () => {
      const error = new Error('Test error');
      renderComponent({ error });
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('should show back button when showBackButton is true', () => {
      renderComponent({ showBackButton: true });
      const backLink = screen.getByLabelText('Back to executions');
      expect(backLink).toBeInTheDocument();
    });

    it('should not show back button when showBackButton is false', () => {
      renderComponent({ showBackButton: false });
      expect(screen.queryByLabelText('Back to executions')).not.toBeInTheDocument();
    });

    it('should call onClose when back button is clicked', () => {
      const onClose = jest.fn();
      renderComponent({ onClose });
      const backLink = screen.getByLabelText('Back to executions');
      fireEvent.click(backLink);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel button', () => {
    it('should show cancel button for cancelable status (RUNNING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.RUNNING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for cancelable status (WAITING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.WAITING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for cancelable status (WAITING_FOR_INPUT)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.WAITING_FOR_INPUT },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for cancelable status (PENDING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.PENDING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should not show cancel button for terminal status (COMPLETED)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });

    it('should not show cancel button for terminal status (FAILED)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.FAILED },
      });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });

    it('should not show cancel button when execution is null', () => {
      renderComponent({ execution: null });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });
  });

  describe('done button', () => {
    it('should show done button when showBackButton is false and status is terminal', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      const doneButton = screen.getByLabelText('Done');
      expect(doneButton).toBeInTheDocument();
    });

    it('should show done button for FAILED status when showBackButton is false', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.FAILED },
      });
      const doneButton = screen.getByLabelText('Done');
      expect(doneButton).toBeInTheDocument();
    });

    it('should not show done button when showBackButton is true', () => {
      renderComponent({
        showBackButton: true,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should not show done button when status is not terminal', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.RUNNING },
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should not show done button when execution is null', () => {
      renderComponent({
        showBackButton: false,
        execution: null,
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should call onClose when done button is clicked', () => {
      const onClose = jest.fn();
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
        onClose,
      });
      const doneButton = screen.getByLabelText('Done');
      fireEvent.click(doneButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('step execution interaction', () => {
    it('should pass selectedId to WorkflowStepExecutionTree', () => {
      renderComponent({ selectedId: 'step-456' });
      expect(screen.getByText('step-456')).toBeInTheDocument();
    });

    it('should call onStepExecutionClick when step is clicked', () => {
      const onStepExecutionClick = jest.fn();
      renderComponent({ onStepExecutionClick });
      const stepButton = screen.getByTestId('mock-step-click');
      fireEvent.click(stepButton);
      expect(onStepExecutionClick).toHaveBeenCalledWith('step-123');
      expect(onStepExecutionClick).toHaveBeenCalledTimes(1);
    });

    it('should pass null selectedId when not provided', () => {
      renderComponent({ selectedId: null });
      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle all props being null/empty', () => {
      renderComponent({
        execution: null,
        definition: null,
        error: null,
        selectedId: null,
      });
      expect(screen.getByText('No Execution')).toBeInTheDocument();
      expect(screen.getByText('No Definition')).toBeInTheDocument();
      expect(screen.getByText('No Error')).toBeInTheDocument();
      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });
  });
});
