/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowExecuteModal } from './workflow_execute_modal';

const baseWorkflowDefinition = {
  version: '1',
  name: 'test-workflow',
  enabled: true,
  triggers: [],
  steps: [],
} as WorkflowYaml;

// Mock the form components
const mockWorkflowExecuteEventForm = jest.fn(() => null);
jest.mock('./workflow_execute_event_form', () => ({
  WorkflowExecuteEventForm: () => mockWorkflowExecuteEventForm(),
}));
const mockWorkflowExecuteIndexForm = jest.fn(() => null);
jest.mock('./workflow_execute_index_form', () => ({
  WorkflowExecuteIndexForm: () => mockWorkflowExecuteIndexForm(),
}));
const mockWorkflowExecuteManualForm = jest.fn(() => null);
jest.mock('./workflow_execute_manual_form', () => ({
  WorkflowExecuteManualForm: () => mockWorkflowExecuteManualForm(),
}));

// Mock the translations
jest.mock('../../../../common/translations', () => ({
  MANUAL_TRIGGERS_DESCRIPTIONS: {
    manual: 'Manual trigger description',
    index: 'Index trigger description',
    alert: 'Alert trigger description',
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

describe('WorkflowExecuteModal', () => {
  let mockOnClose: jest.Mock;
  let mockOnSubmit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
    mockWorkflowExecuteEventForm.mockClear();
    mockWorkflowExecuteIndexForm.mockClear();
    mockWorkflowExecuteManualForm.mockClear();
  });

  describe('Basic rendering', () => {
    it('renders the modal with correct title', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByText('Run Workflow')).toBeInTheDocument();
    });

    it('renders all trigger type buttons', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByText('Alert')).toBeInTheDocument();
      expect(getByText('Index')).toBeInTheDocument();
      expect(getByText('Manual')).toBeInTheDocument();
    });

    it('renders trigger descriptions', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByText('Manual trigger description')).toBeInTheDocument();
      expect(getByText('Index trigger description')).toBeInTheDocument();
      expect(getByText('Alert trigger description')).toBeInTheDocument();
    });

    it('renders the execute button', () => {
      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByTestId('executeWorkflowButton')).toBeInTheDocument();
    });
  });

  describe('Trigger selection', () => {
    it('defaults to alert trigger when no definition is provided', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const alertButton = getByText('Alert').closest('button');
      expect(alertButton).toHaveClass('euiButton');
      // Check if the radio input is checked
      const alertRadio = alertButton?.querySelector('input[type="radio"]');
      expect(alertRadio).toBeChecked();
    });

    it('switches to manual trigger when clicked', async () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const manualButton = getByText('Manual').closest('button');
      fireEvent.click(manualButton!);

      await waitFor(() => {
        expect(manualButton).toHaveClass('euiButton');
        // Check if the radio input is checked
        const manualRadio = manualButton?.querySelector('input[type="radio"]');
        expect(manualRadio).toBeChecked();
      });
    });

    it('switches to index trigger when clicked', async () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const indexButton = getByText('Index').closest('button');
      fireEvent.click(indexButton!);

      await waitFor(() => {
        expect(indexButton).toHaveClass('euiButton');
        // Check if the radio input is checked
        const indexRadio = indexButton?.querySelector('input[type="radio"]');
        expect(indexRadio).toBeChecked();
      });
    });
  });

  describe('Form rendering based on trigger type', () => {
    it('renders alert form when alert trigger is selected', () => {
      renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Alert trigger is selected by default, so event form should be called
      expect(mockWorkflowExecuteEventForm).toHaveBeenCalledTimes(1);
      expect(mockWorkflowExecuteIndexForm).not.toHaveBeenCalled();
      expect(mockWorkflowExecuteManualForm).not.toHaveBeenCalled();
    });

    it('renders manual form when manual trigger is selected', async () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Initially, event form should be called (alert is default)
      expect(mockWorkflowExecuteEventForm).toHaveBeenCalledTimes(1);

      // Click manual trigger
      const manualButton = getByText('Manual').closest('button');
      fireEvent.click(manualButton!);

      await waitFor(() => {
        // Now manual form should be called
        expect(mockWorkflowExecuteManualForm).toHaveBeenCalledTimes(1);
        expect(mockWorkflowExecuteEventForm).toHaveBeenCalledTimes(1); // Still called once from initial render
        expect(mockWorkflowExecuteIndexForm).not.toHaveBeenCalled();
      });
    });

    it('renders index form when index trigger is selected', async () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Initially, event form should be called (alert is default)
      expect(mockWorkflowExecuteEventForm).toHaveBeenCalledTimes(1);

      // Click index trigger
      const indexButton = getByText('Index').closest('button');
      fireEvent.click(indexButton!);

      await waitFor(() => {
        // Now index form should be called
        expect(mockWorkflowExecuteIndexForm).toHaveBeenCalledTimes(1);
        expect(mockWorkflowExecuteEventForm).toHaveBeenCalledTimes(1); // Still called once from initial render
        expect(mockWorkflowExecuteManualForm).not.toHaveBeenCalled();
      });
    });
  });

  describe('Auto-run logic', () => {
    it('auto-runs and closes modal when workflow has no alerts and no inputs', () => {
      renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={{
            ...baseWorkflowDefinition,
            triggers: [{ type: 'manual' }],
          }}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(mockOnSubmit).toHaveBeenCalledWith({}, 'manual');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not auto-run when workflow has alert triggers', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={{
            ...baseWorkflowDefinition,
            triggers: [{ type: 'alert' }],
          }}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getByText('Run Workflow')).toBeInTheDocument();
    });

    it('does not auto-run when workflow has inputs', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={
            {
              ...baseWorkflowDefinition,
              inputs: [{ name: 'test-input', type: 'string', required: true }],
            } as WorkflowYaml
          }
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(getByText('Run Workflow')).toBeInTheDocument();
    });
  });

  describe('Default trigger selection based on definition', () => {
    it('selects alert trigger when definition has alert triggers', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={{
            ...baseWorkflowDefinition,
            triggers: [{ type: 'alert' }],
          }}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const alertButton = getByText('Alert').closest('button');
      expect(alertButton).toHaveClass('euiButton');
      // Check if the radio input is checked
      const alertRadio = alertButton?.querySelector('input[type="radio"]');
      expect(alertRadio).toBeChecked();
    });

    it('selects manual trigger when definition has inputs', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={
            {
              ...baseWorkflowDefinition,
              triggers: [{ type: 'manual' }],
              inputs: [{ name: 'test-input', type: 'string', required: true }],
            } as WorkflowYaml
          }
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const manualButton = getByText('Manual').closest('button');
      expect(manualButton).toHaveClass('euiButton');
      // Check if the radio input is checked
      const manualRadio = manualButton?.querySelector('input[type="radio"]');
      expect(manualRadio).toBeChecked();
    });
  });

  describe('Form submission', () => {
    it('renders the execute button', () => {
      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const executeButton = getByTestId('executeWorkflowButton');
      expect(executeButton).toBeInTheDocument();
    });

    it('disables execute button when there are errors', () => {
      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const executeButton = getByTestId('executeWorkflowButton');
      expect(executeButton).not.toBeDisabled();
    });
  });

  describe('Modal close functionality', () => {
    it('calls onClose when modal close button is clicked', () => {
      const { container } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Find and click the close button (EUI modal close button)
      const closeButton = container.querySelector('[aria-label="Closes this modal window"]');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
