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
import { ChangeHistoryModalContext } from '@kbn/change-history-ui';
import { useWorkflowsCapabilities, type WorkflowsManagementCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { SkipUnsavedRunConfirmationStorageKey } from './use_run_workflow_with_confirmation';
import { WorkflowDetailHeader, type WorkflowDetailHeaderProps } from './workflow_detail_header';
import { PLUGIN_ID } from '../../../../common';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  _clearComputedData,
  setActiveTab,
  setHasYamlSchemaValidationErrors,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { saveYamlThunk } from '../../../entities/workflows/store/workflow_detail/thunks/save_yaml_thunk';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockUseKibana = jest.fn();
const mockUseParams = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseSaveYaml = jest.fn();
const mockUseUpdateWorkflow = jest.fn();
const mockUseMemoCss = jest.fn();
let mockNavigateToApp: jest.Mock;

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  // Keep app menu breakpoint checks on xl so its items render inline in tests.
  useIsWithinBreakpoints: (breakpoints: string[]) => breakpoints.includes('xl'),
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
jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: jest.fn().mockReturnValue(false),
}));

// The run action renders inline in the app menu.
const openRunWorkflowButton = async (): Promise<HTMLElement> =>
  screen.getByTestId('runWorkflowHeaderButton');

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
      isSaving = false,
      isManaged = false,
      routerHistory,
    }: {
      isValid?: boolean;
      hasChanges?: boolean;
      hasYamlSchemaValidationErrors?: boolean;
      serverValid?: boolean;
      isSaving?: boolean;
      isManaged?: boolean;
      routerHistory?: React.ComponentProps<typeof TestWrapper>['routerHistory'];
    } = {}
  ) => {
    const store = createMockStore();

    // Set up the workflow in the store (with server-side valid flag)
    store.dispatch(setWorkflow({ ...mockWorkflow, managed: isManaged, valid: serverValid }));
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
    if (isSaving) {
      store.dispatch(saveYamlThunk.pending('', undefined));
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <TestWrapper store={store} routerHistory={routerHistory}>
          {children}
        </TestWrapper>
      );
    };

    return { ...render(component, { wrapper }), store };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockNavigateToApp = jest.fn();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
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

  // The app menu is rendered through a React.lazy boundary. Warm it up once so the
  // synchronous tests below render the menu items without triggering an unwrapped
  // Suspense resolution (which React reports as an act(...) warning).
  beforeAll(async () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: { navigateToApp: jest.fn() },
        settings: { client: { get: () => '' } },
      },
    });
    mockUseParams.mockReturnValue({ id: 'test-123' });
    mockUseWorkflowsCapabilities.mockReturnValue(createMockWorkflowsCapabilities());
    mockUseWorkflowUrlState.mockReturnValue({ activeTab: 'workflow', setActiveTab: jest.fn() });
    mockUseSaveYaml.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null, result: undefined },
    ]);
    mockUseUpdateWorkflow.mockReturnValue(jest.fn());
    mockUseMemoCss.mockReturnValue(jest.fn());
    const { findByTestId, unmount } = renderWithProviders(
      <WorkflowDetailHeader {...defaultProps} />
    );
    await findByTestId('saveWorkflowHeaderButton');
    unmount();
  });

  it('should render', () => {
    const { getAllByText } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    expect(getAllByText('Test Workflow').length).toBeGreaterThan(0);
  });

  it('navigates back to the workflows list with the stored list search params', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      routerHistory: [
        {
          pathname: '/test-123',
          state: { workflowsListSearch: '?tags=prod&enabled=true' },
        },
      ],
    });

    fireEvent.click(result.getByTestId('appHeaderBack'));

    expect(mockNavigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
      path: '?tags=prod&enabled=true',
    });
  });

  it('shows saved status when no changes', () => {
    const { getByTestId } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    expect(getByTestId('saveWorkflowHeaderButton')).toBeDisabled();
  });

  it('shows unsaved changes when there are changes', () => {
    const { getByTestId } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasChanges: true,
    });
    expect(getByTestId('saveWorkflowHeaderButton')).not.toBeDisabled();
  });

  it('disables run workflow button when yaml has syntax errors', async () => {
    renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: false,
    });
    expect(await openRunWorkflowButton()).toBeDisabled();
  });

  it('enables run workflow button when yaml has validation errors', async () => {
    renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasYamlSchemaValidationErrors: true,
    });
    expect(await openRunWorkflowButton()).toBeEnabled();
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

  it('enables run workflow button when yaml is valid', async () => {
    renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    expect(await openRunWorkflowButton()).toBeEnabled();
  });

  it('shows the managed badge for managed workflows', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isManaged: true,
    });

    expect(result.getByTestId('workflowDetailManagedBadge')).toHaveTextContent('Managed');
  });

  it('toggles diff highlighting when the unsaved changes badge is clicked', () => {
    const setHighlightDiff = jest.fn();
    const result = renderWithProviders(
      <WorkflowDetailHeader {...defaultProps} setHighlightDiff={setHighlightDiff} />,
      { hasChanges: true }
    );

    fireEvent.click(result.getByTestId('workflowUnsavedChangesBadge'));

    expect(setHighlightDiff).toHaveBeenCalledTimes(1);
  });

  it('keeps the enabled toggle editable for managed workflows', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isManaged: true,
    });

    expect(result.getByRole('switch')).not.toBeDisabled();
  });

  it('disables saving managed workflow YAML', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      hasChanges: true,
      isManaged: true,
    });

    expect(result.getByTestId('saveWorkflowHeaderButton')).toBeDisabled();
  });

  it('shows the unsaved changes confirmation when running with unsaved changes', async () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      hasChanges: true,
    });

    fireEvent.click(await openRunWorkflowButton());

    expect(
      result.getByTestId('runWorkflowWithUnsavedChangesConfirmationModal')
    ).toBeInTheDocument();
    expect(result.getByTestId('runWorkflowWithUnsavedChangesDontAskAgain')).toBeInTheDocument();
  });

  it('stores the run confirmation preference when confirming with the checkbox selected', async () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      hasChanges: true,
    });

    fireEvent.click(await openRunWorkflowButton());
    fireEvent.click(result.getByTestId('runWorkflowWithUnsavedChangesDontAskAgain'));
    fireEvent.click(result.getByTestId('confirmModalConfirmButton'));

    expect(localStorage.getItem(SkipUnsavedRunConfirmationStorageKey)).toBe('true');
    expect(result.queryByTestId('runWorkflowWithUnsavedChangesConfirmationModal')).toBeNull();
    expect(result.store.getState().detail.isTestModalOpen).toBe(true);
  });

  it('skips the unsaved changes confirmation when the preference is stored', async () => {
    localStorage.setItem(SkipUnsavedRunConfirmationStorageKey, 'true');
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      hasChanges: true,
    });

    fireEvent.click(await openRunWorkflowButton());

    expect(result.queryByTestId('runWorkflowWithUnsavedChangesConfirmationModal')).toBeNull();
    expect(result.store.getState().detail.isTestModalOpen).toBe(true);
  });

  it('disables run workflow button while save is in flight', async () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      hasChanges: true,
      isSaving: true,
    });

    const runButton = await openRunWorkflowButton();

    expect(runButton).toBeDisabled();
    fireEvent.click(runButton);

    expect(result.queryByTestId('runWorkflowWithUnsavedChangesConfirmationModal')).toBeNull();
    expect(result.store.getState().detail.isTestModalOpen).toBe(false);
  });

  it('disables executions tab when user cannot read workflow executions', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...defaultWorkflowsCapabilities,
      canReadWorkflowExecution: false,
    });
    const { getByRole } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    const executionsTab = getByRole('button', { name: 'Executions' });
    expect(executionsTab).toBeDisabled();
  });

  it('disables executions tab for managed workflows when user cannot read managed workflow executions', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...defaultWorkflowsCapabilities,
      canReadWorkflowExecution: true,
      canReadManagedWorkflowExecution: false,
    });
    const { getByRole } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isManaged: true,
    });
    const executionsTab = getByRole('button', { name: 'Executions' });
    expect(executionsTab).toBeDisabled();
  });

  it('keeps executions tab enabled for custom workflows when only managed workflow execution read is missing', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...defaultWorkflowsCapabilities,
      canReadWorkflowExecution: true,
      canReadManagedWorkflowExecution: false,
    });
    const { getByRole } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    const executionsTab = getByRole('button', { name: 'Executions' });
    expect(executionsTab).not.toBeDisabled();
  });

  describe('Authorization matrix', () => {
    interface MatrixRow {
      roleLabel: string;
      capabilities: Partial<WorkflowsManagementCapabilities>;
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
        expectSaveDisabled: true,
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
        expectSaveDisabled: true,
        expectEnabledSwitchDisabled: false,
        expectExecutionsTabDisabled: true,
      },
    ];

    it.each(matrix)(
      '$roleLabel: save=$expectSaveDisabled, enabled switch=$expectEnabledSwitchDisabled, executions tab=$expectExecutionsTabDisabled',
      async ({
        capabilities,
        expectSaveDisabled,
        expectEnabledSwitchDisabled,
        expectExecutionsTabDisabled,
      }) => {
        mockUseWorkflowsCapabilities.mockReturnValue({
          ...defaultWorkflowsCapabilities,
          ...capabilities,
        });

        const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
        const saveBtn = await result.findByTestId('saveWorkflowHeaderButton');

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
          expect(executionsTab).toBeDisabled();
        } else {
          expect(executionsTab).not.toBeDisabled();
        }
      }
    );

    it('New workflow URL: save requires createWorkflow, not updateWorkflow', async () => {
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

      const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
        hasChanges: true,
      });
      expect(await result.findByTestId('saveWorkflowHeaderButton')).not.toBeDisabled();
    });
  });

  it('exposes the change history entry point on the workflow tab when a workflow id is present', () => {
    const changeHistoryModal = {
      isOpen: false,
      openModal: jest.fn(),
      closeModal: jest.fn(),
    };
    const { getByTestId } = renderWithProviders(
      <ChangeHistoryModalContext.Provider value={changeHistoryModal}>
        <WorkflowDetailHeader {...defaultProps} />
      </ChangeHistoryModalContext.Provider>
    );

    // History lives in the overflow ("More") menu, so open it before locating the entry point.
    fireEvent.click(getByTestId('app-menu-overflow-button'));

    const historyItem = getByTestId('workflowDetailHistoryButton');
    expect(historyItem).toBeInTheDocument();

    fireEvent.click(historyItem);
    expect(changeHistoryModal.openModal).toHaveBeenCalledTimes(1);
  });

  it('does not expose the change history entry point on the executions tab', () => {
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setActiveTab: jest.fn(),
    });

    const store = createMockStore();
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setYamlString(mockWorkflow.yaml));
    store.dispatch(setActiveTab('executions'));

    const changeHistoryModal = {
      isOpen: false,
      openModal: jest.fn(),
      closeModal: jest.fn(),
    };
    const { queryByTestId } = render(
      <ChangeHistoryModalContext.Provider value={changeHistoryModal}>
        <WorkflowDetailHeader {...defaultProps} />
      </ChangeHistoryModalContext.Provider>,
      {
        wrapper: ({ children }) => <TestWrapper store={store}>{children}</TestWrapper>,
      }
    );

    expect(queryByTestId('workflowDetailHistoryButton')).not.toBeInTheDocument();
  });
});
