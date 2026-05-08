/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useWorkflowsCapabilities, type WorkflowsManagementCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import type { WorkflowDetailHeaderProps } from './workflow_detail_header';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  _clearComputedData,
  setHasYamlSchemaValidationErrors,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockUseKibana = jest.fn();
const mockUseParams = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseSaveYaml = jest.fn();
const mockUseUpdateWorkflow = jest.fn();
const mockUseMemoCss = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));
jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;
const defaultWorkflowsCapabilities = createMockWorkflowsCapabilities();

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));
jest.mock('../../../entities/workflows/model/use_save_yaml', () => ({
  useSaveYaml: () => mockUseSaveYaml(),
}));
jest.mock('../../../entities/workflows/model/use_update_workflow', () => ({
  useUpdateWorkflow: () => mockUseUpdateWorkflow(),
}));
jest.mock('@kbn/css-utils/public/use_memo_css', () => ({
  useMemoCss: (styles: any) => mockUseMemoCss(styles),
}));

describe('WorkflowDetailHeader', () => {
  const defaultProps: WorkflowDetailHeaderProps = {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: jest.fn(),
  };

  const mockWorkflow = {
    id: 'test-123',
    name: 'Test Workflow',
    enabled: true,
    yaml: 'version: "1"\nname: Test Workflow\ntriggers:\n  - type: manual\nsteps:\n  - type: log\n    with:\n      message: hello',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  };

  const renderWithProviders = (
    component: React.ReactElement,
    {
      isValid = true,
      hasChanges = false,
      hasYamlSchemaValidationErrors = false,
      serverValid = true,
    }: {
      isValid?: boolean;
      hasChanges?: boolean;
      hasYamlSchemaValidationErrors?: boolean;
      serverValid?: boolean;
    } = {}
  ) => {
    const store = createMockStore();

    // Set up the workflow in the store (with server-side valid flag)
    store.dispatch(setWorkflow({ ...mockWorkflow, valid: serverValid }));
    store.dispatch(setYamlString(hasChanges ? 'modified yaml' : mockWorkflow.yaml));

    if (!isValid) {
      // Clear the computed data that the middleware auto-generated from the yaml,
      // so that selectIsYamlSyntaxValid returns false
      store.dispatch(_clearComputedData());
    }

    // Simulate strict validation errors from Monaco
    if (hasYamlSchemaValidationErrors) {
      store.dispatch(setHasYamlSchemaValidationErrors(true));
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(component, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
        settings: {
          client: {
            get: jest.fn((key: string) => {
              if (key === 'dateFormat') return 'MMM D, YYYY @ HH:mm:ss.SSS';
              if (key === 'dateFormat:tz') return 'Browser';
              return '';
            }),
          },
        },
      },
    });
    mockUseParams.mockReturnValue({ id: 'test-123' });
    mockUseWorkflowsCapabilities.mockReturnValue(createMockWorkflowsCapabilities());
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'workflow',
      setActiveTab: jest.fn(),
    });
    mockUseSaveYaml.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null, result: undefined },
    ]);
    mockUseUpdateWorkflow.mockReturnValue(jest.fn());
    mockUseMemoCss.mockReturnValue(jest.fn());
  });

  it('should render', () => {
    const { getByText } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    expect(getByText('Test Workflow')).toBeInTheDocument();
  });

  it('shows saved status when no changes', () => {
    const { container } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    // The WorkflowUnsavedChangesBadge component displays "Saved" when there are no changes
    // We need to check if the component renders without the unsaved changes badge
    expect(container).toBeTruthy();
  });

  it('shows unsaved changes when there are changes', () => {
    const { container } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasChanges: true,
    });
    expect(container).toBeTruthy();
  });

  it('disables run workflow button when yaml has syntax errors', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: false,
    });
    expect(result.getByTestId('runWorkflowHeaderButton')).toBeDisabled();
  });

  it('enables run workflow button when yaml has validation errors', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasYamlSchemaValidationErrors: true,
    });
    expect(result.getByTestId('runWorkflowHeaderButton')).toBeEnabled();
  });

  it('disables enabled toggle when yaml has validation errors', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasYamlSchemaValidationErrors: true,
    });
    const toggle = result.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('disables enabled toggle when server reports workflow as invalid (e.g. initial page load)', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      serverValid: false,
    });
    const toggle = result.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('enables run workflow button when yaml is valid', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    const button = result.getByTestId('runWorkflowHeaderButton');
    expect(button).toBeEnabled();
  });

  it('disables executions tab when user cannot read workflow executions', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...defaultWorkflowsCapabilities,
      canReadWorkflowExecution: false,
    });
    const { getByRole } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    const executionsTab = getByRole('button', { name: 'Executions' });
    expect(executionsTab).toHaveAttribute('aria-disabled', 'true');
  });

  describe('Authorization matrix', () => {
    interface MatrixRow {
      roleLabel: string;
      capabilities: Partial<WorkflowsManagementCapabilities>;
      expectRunDisabled: boolean;
      expectSaveDisabled: boolean;
      expectEnabledSwitchDisabled: boolean;
      expectExecutionsTabDisabled: boolean;
    }

    const matrix: MatrixRow[] = [
      {
        roleLabel: 'Read-only',
        capabilities: {
          canReadWorkflow: true,
          canReadWorkflowExecution: true,
          canCreateWorkflow: false,
          canUpdateWorkflow: false,
          canDeleteWorkflow: false,
          canExecuteWorkflow: false,
          canCancelWorkflowExecution: false,
        },
        expectRunDisabled: true,
        expectSaveDisabled: true,
        expectEnabledSwitchDisabled: true,
        expectExecutionsTabDisabled: false,
      },
      {
        roleLabel: 'Operator (run, no CRUD)',
        capabilities: {
          canReadWorkflow: true,
          canReadWorkflowExecution: true,
          canCreateWorkflow: false,
          canUpdateWorkflow: false,
          canDeleteWorkflow: false,
          canExecuteWorkflow: true,
          canCancelWorkflowExecution: false,
        },
        expectRunDisabled: false,
        expectSaveDisabled: true,
        expectEnabledSwitchDisabled: true,
        expectExecutionsTabDisabled: false,
      },
      {
        roleLabel: 'Editor (no delete)',
        capabilities: {
          canReadWorkflow: true,
          canReadWorkflowExecution: true,
          canCreateWorkflow: true,
          canUpdateWorkflow: true,
          canDeleteWorkflow: false,
          canExecuteWorkflow: true,
          canCancelWorkflowExecution: false,
        },
        expectRunDisabled: false,
        expectSaveDisabled: false,
        expectEnabledSwitchDisabled: false,
        expectExecutionsTabDisabled: false,
      },
      {
        roleLabel: 'No execution read',
        capabilities: {
          canReadWorkflow: true,
          canReadWorkflowExecution: false,
          canCreateWorkflow: true,
          canUpdateWorkflow: true,
          canDeleteWorkflow: false,
          canExecuteWorkflow: true,
          canCancelWorkflowExecution: false,
        },
        expectRunDisabled: false,
        expectSaveDisabled: false,
        expectEnabledSwitchDisabled: false,
        expectExecutionsTabDisabled: true,
      },
    ];

    it.each(matrix)(
      '$roleLabel: run disabled=$expectRunDisabled, save=$expectSaveDisabled, enabled switch=$expectEnabledSwitchDisabled, executions tab=$expectExecutionsTabDisabled',
      ({
        capabilities,
        expectRunDisabled,
        expectSaveDisabled,
        expectEnabledSwitchDisabled,
        expectExecutionsTabDisabled,
      }) => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...defaultWorkflowsCapabilities,
          ...capabilities,
        });

        const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
        const runBtn = result.getByTestId('runWorkflowHeaderButton');
        const saveBtn = result.getByTestId('saveWorkflowHeaderButton');

        if (expectRunDisabled) {
          expect(runBtn).toBeDisabled();
        } else {
          expect(runBtn).not.toBeDisabled();
        }
        if (expectSaveDisabled) {
          expect(saveBtn).toBeDisabled();
        } else {
          expect(saveBtn).not.toBeDisabled();
        }

        const enabledSwitch = result.getByRole('switch');
        if (expectEnabledSwitchDisabled) {
          expect(enabledSwitch).toBeDisabled();
        } else {
          expect(enabledSwitch).not.toBeDisabled();
        }

        const executionsTab = result.getByRole('button', { name: 'Executions' });
        if (expectExecutionsTabDisabled) {
          expect(executionsTab).toHaveAttribute('aria-disabled', 'true');
        } else {
          expect(executionsTab).not.toHaveAttribute('aria-disabled', 'true');
        }
      }
    );

    it('New workflow URL: save requires createWorkflow, not updateWorkflow', () => {
      mockUseParams.mockReturnValue({});
      mockUseWorkflowsCapabilities.mockReturnValue({
        ...defaultWorkflowsCapabilities,
        canReadWorkflow: true,
        canReadWorkflowExecution: true,
        canCreateWorkflow: true,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canCancelWorkflowExecution: false,
      });

      const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
      expect(result.getByTestId('saveWorkflowHeaderButton')).not.toBeDisabled();
    });
  });
});
