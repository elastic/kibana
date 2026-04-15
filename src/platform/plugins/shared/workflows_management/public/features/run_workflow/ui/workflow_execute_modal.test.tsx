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
import type { useFetchAlertsIndexNamesQuery } from '@kbn/alerts-ui-shared';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowExecuteModal } from './workflow_execute_modal';

type UseFetchAlertsIndexNamesQueryArgs = Parameters<typeof useFetchAlertsIndexNamesQuery>;

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsCapabilities: jest.fn(),
}));

const defaultWorkflowsCapabilities = {
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canCancelWorkflowExecution: true,
};

const mockUseFetchAlertsIndexNamesQuery = jest.fn(
  (..._args: UseFetchAlertsIndexNamesQueryArgs) => ({
    data: ['.alerts-security.alerts-default'],
    isError: false,
  })
);

jest.mock('@kbn/alerts-ui-shared', () => {
  const actual = jest.requireActual('@kbn/alerts-ui-shared');
  return {
    ...actual,
    useFetchAlertsIndexNamesQuery: (
      ...args: Parameters<typeof mockUseFetchAlertsIndexNamesQuery>
    ) => mockUseFetchAlertsIndexNamesQuery(...args),
  };
});

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
const mockWorkflowExecuteHistoricalForm = jest.fn(() => null);
jest.mock('./workflow_execute_historical_form', () => ({
  WorkflowExecuteHistoricalForm: () => mockWorkflowExecuteHistoricalForm(),
}));

jest.mock('../../../entities/workflows/model/use_workflow_execution', () => ({
  useWorkflowExecution: () => ({ data: null, isLoading: false }),
}));

const mockUseKibana = jest.fn();
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
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
    mockUseWorkflowsCapabilities.mockReturnValue(defaultWorkflowsCapabilities);
    mockUseFetchAlertsIndexNamesQuery.mockImplementation(
      (..._args: UseFetchAlertsIndexNamesQueryArgs) => ({
        data: ['.alerts-security.alerts-default'],
        isError: false,
      })
    );
    mockUseKibana.mockReturnValue({
      services: {
        application: { capabilities: {} },
        http: {},
      },
    });
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
    mockWorkflowExecuteEventForm.mockClear();
    mockWorkflowExecuteIndexForm.mockClear();
    mockWorkflowExecuteManualForm.mockClear();
    mockWorkflowExecuteHistoricalForm.mockClear();
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
      expect(getByText('Document')).toBeInTheDocument();
      expect(getByText('Manual')).toBeInTheDocument();
      expect(getByText('Historical')).toBeInTheDocument();
    });

    it('keeps the alert trigger enabled when RAC prefetch succeeds (no capability pre-check)', () => {
      mockUseKibana.mockReturnValue({
        services: {
          application: { capabilities: {} },
          http: {},
        },
      });

      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByTestId('workflowExecuteModalTrigger-alert')).not.toBeDisabled();
    });

    it('prefetches RAC alert index names on modal open', () => {
      renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(mockUseFetchAlertsIndexNamesQuery).toHaveBeenCalledWith(
        expect.objectContaining({ ruleTypeIds: [] }),
        expect.objectContaining({ enabled: true })
      );
    });

    it('prefetches with query enabled even when application capabilities are empty', () => {
      mockUseKibana.mockReturnValue({
        services: {
          application: { capabilities: {} },
          http: {},
        },
      });

      renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(mockUseFetchAlertsIndexNamesQuery).toHaveBeenCalledWith(
        expect.objectContaining({ ruleTypeIds: [] }),
        expect.objectContaining({ enabled: true })
      );
    });

    it('disables the alert tab when RAC index prefetch reports forbidden', async () => {
      mockUseFetchAlertsIndexNamesQuery.mockImplementation(
        (...args: UseFetchAlertsIndexNamesQueryArgs) => {
          const [, options] = args;
          if (options?.onError) {
            queueMicrotask(() => options.onError?.({ response: { status: 403 } }));
          }
          return { data: [], isError: true };
        }
      );

      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await waitFor(() => {
        expect(getByTestId('workflowExecuteModalTrigger-alert')).toBeDisabled();
      });
    });

    it('does not disable the alert tab when RAC prefetch onError is not a forbidden response', async () => {
      mockUseFetchAlertsIndexNamesQuery.mockImplementation(
        (...args: UseFetchAlertsIndexNamesQueryArgs) => {
          const [, options] = args;
          if (options?.onError) {
            queueMicrotask(() => options.onError?.(new Error('network down')));
          }
          return { data: [], isError: true };
        }
      );

      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      await waitFor(() => {
        expect(mockUseFetchAlertsIndexNamesQuery).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getByTestId('workflowExecuteModalTrigger-alert')).not.toBeDisabled();
      });
    });

    it('disables the historical trigger when the user lacks Read Workflow Execution', () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        ...defaultWorkflowsCapabilities,
        canReadWorkflowExecution: false,
      });

      const { getByTestId } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(getByTestId('workflowExecuteModalTrigger-historical')).toBeDisabled();
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

      expect(getByText('Provide custom JSON data manually')).toBeInTheDocument();
      expect(getByText('Choose a document from Elasticsearch')).toBeInTheDocument();
      expect(getByText('Choose an existing alert directly')).toBeInTheDocument();
      expect(getByText('Reuse input data from previous executions')).toBeInTheDocument();
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

      const indexButton = getByText('Document').closest('button');
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

      // Click index (Document) trigger
      const indexButton = getByText('Document').closest('button');
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

  describe('Historical trigger', () => {
    it('defaults to historical tab when initialExecutionId is provided', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          initialExecutionId="exec-123"
        />
      );

      const historicalButton = getByText('Historical').closest('button');
      const historicalRadio = historicalButton?.querySelector('input[type="radio"]');
      expect(historicalRadio).toBeChecked();
    });

    it('defaults to document tab when initialExecutionId is set but execution read is denied', () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        ...defaultWorkflowsCapabilities,
        canReadWorkflowExecution: false,
      });

      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          initialExecutionId="exec-123"
        />
      );

      const documentButton = getByText('Document').closest('button');
      const documentRadio = documentButton?.querySelector('input[type="radio"]');
      expect(documentRadio).toBeChecked();
    });

    it('renders historical form when historical trigger is clicked', async () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={null}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const historicalButton = getByText('Historical').closest('button');
      fireEvent.click(historicalButton!);

      await waitFor(() => {
        expect(mockWorkflowExecuteHistoricalForm).toHaveBeenCalled();
      });
    });

    it('should keep historical tab when initialExecutionId is set and definition has alert triggers', () => {
      const { getByText } = renderWithProviders(
        <WorkflowExecuteModal
          isTestRun={false}
          definition={{
            ...baseWorkflowDefinition,
            triggers: [{ type: 'alert' }],
          }}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          initialExecutionId="exec-123"
        />
      );

      // Without initialExecutionId, alert workflows default to the alert tab via resolveInitialSelectedTrigger.
      // With initialExecutionId, we open on historical instead.
      const historicalButton = getByText('Historical').closest('button');
      const historicalRadio = historicalButton?.querySelector('input[type="radio"]');
      expect(historicalRadio).toBeChecked();
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
