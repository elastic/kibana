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
import type { WorkflowListDto, WorkflowListItemDto, WorkflowsSearchParams } from '@kbn/workflows';
import { WorkflowList } from './workflow_list';
import { createUseKibanaMockValue } from '../../../mocks';
import { TestWrapper } from '../../../shared/test_utils';

// --- Mocks ---

jest.mock('../../../hooks/use_kibana');

const mockKibanaValue = createUseKibanaMockValue();
const { application: mockApplication } = mockKibanaValue.services;

// Configure capabilities needed by the component
(mockApplication.capabilities as Record<string, Record<string, boolean>>).workflowsManagement = {
  createWorkflow: true,
  updateWorkflow: true,
  deleteWorkflow: true,
  executeWorkflow: true,
};

(mockApplication.getUrlForApp as jest.Mock).mockReturnValue('/app/workflows/wf-1');

jest.mock('../../../hooks/use_telemetry', () => ({
  useTelemetry: () => ({
    reportWorkflowListViewed: jest.fn(),
    reportWorkflowExported: jest.fn(),
    reportWorkflowDeleted: jest.fn(),
    reportWorkflowUpdated: jest.fn(),
    reportWorkflowCloned: jest.fn(),
    reportWorkflowRunInitiated: jest.fn(),
  }),
}));

const mockRefetch = jest.fn().mockResolvedValue({ data: null });
const mockUseWorkflows = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflows: (...args: unknown[]) => mockUseWorkflows(...args),
}));

jest.mock('./use_event_driven_execution_status', () => ({
  useEventDrivenExecutionStatus: () => ({
    eventDrivenExecutionEnabled: true,
    isLoading: false,
    error: false,
  }),
}));

const mockDeleteWorkflows = { mutate: jest.fn() };
const mockRunWorkflow = { mutate: jest.fn() };
const mockCloneWorkflow = { mutate: jest.fn() };
const mockUpdateWorkflow = { mutate: jest.fn() };

jest.mock('../../../entities/workflows/model/use_workflow_actions', () => ({
  useWorkflowActions: () => ({
    deleteWorkflows: mockDeleteWorkflows,
    runWorkflow: mockRunWorkflow,
    cloneWorkflow: mockCloneWorkflow,
    updateWorkflow: mockUpdateWorkflow,
  }),
}));

jest.mock('./use_export_with_references', () => ({
  useExportWithReferences: () => ({
    exportModalState: null,
    startExport: jest.fn(),
    handleIgnore: jest.fn(),
    handleAddDirect: jest.fn(),
    handleAddAll: jest.fn(),
    handleCancel: jest.fn(),
  }),
}));

// Mock child components to keep tests focused
jest.mock('./export_references_modal', () => ({
  ExportReferencesModal: () => <div data-test-subj="export-references-modal" />,
}));

jest.mock('./workflows_utility_bar', () => ({
  WorkflowsUtilityBar: () => <div data-test-subj="workflows-utility-bar">{'Utility Bar'}</div>,
}));

jest.mock('../../../components', () => ({
  WorkflowsEmptyState: ({ onCreateWorkflow }: { onCreateWorkflow?: () => void }) => (
    <div data-test-subj="workflows-empty-state">
      <button type="button" onClick={onCreateWorkflow}>
        {'Create Workflow'}
      </button>
    </div>
  ),
}));

jest.mock('../../run_workflow/ui/workflow_execute_modal', () => ({
  WorkflowExecuteModal: () => <div data-test-subj="workflow-execute-modal" />,
}));

jest.mock('../../../shared/ui', () => ({
  getRunTooltipContent: () => 'Run',
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  WorkflowStatus: ({ valid }: { valid: boolean }) => <span>{valid ? 'Valid' : 'Invalid'}</span>,
}));

jest.mock('../../../shared/ui/next_execution_time', () => ({
  NextExecutionTime: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../widgets/worflows_triggers_list/worflows_triggers_list', () => ({
  WorkflowsTriggersList: () => <span>{'Triggers'}</span>,
}));

jest.mock('../../../widgets/workflow_tags/workflow_tags', () => ({
  WorkflowTags: () => <span>{'Tags'}</span>,
}));

// --- Test helpers ---

const createMockWorkflow = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'wf-1',
  name: 'My Test Workflow',
  description: 'A workflow for testing',
  enabled: true,
  definition: {
    version: '1',
    name: 'My Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  },
  createdAt: '2024-01-01T00:00:00Z',
  history: [],
  valid: true,
  ...overrides,
});
const PAGE = 1;
const SIZE = 20;
const defaultSearch: WorkflowsSearchParams = { page: PAGE, size: SIZE };

const createMockWorkflowListDto = (
  workflows: WorkflowListItemDto[] = [createMockWorkflow()]
): WorkflowListDto => ({
  results: workflows,
  total: workflows.length,
  page: PAGE,
  size: SIZE,
});

describe('WorkflowList', () => {
  const setSearch = jest.fn();
  const onCreateWorkflow = jest.fn();

  const defaultProps = {
    search: defaultSearch,
    setSearch,
    onCreateWorkflow,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-configure auto-mock after clearAllMocks
    const { useKibana } = jest.requireMock('../../../hooks/use_kibana') as {
      useKibana: jest.Mock;
    };
    useKibana.mockReturnValue(mockKibanaValue);
    (mockApplication.getUrlForApp as jest.Mock).mockReturnValue('/app/workflows/wf-1');

    mockUseWorkflows.mockReturnValue({
      data: createMockWorkflowListDto(),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  const renderComponent = (overrides: Partial<typeof defaultProps> = {}) => {
    return render(
      <TestWrapper>
        <WorkflowList {...defaultProps} {...overrides} />
      </TestWrapper>
    );
  };

  describe('loading state', () => {
    it('shows loading spinner when workflows are loading', () => {
      mockUseWorkflows.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
    });

    it('does not show the table when loading', () => {
      mockUseWorkflows.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.queryByTestId('workflowListTable')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when there is an error', () => {
      mockUseWorkflows.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Server error'),
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.getByText('Error loading workflows')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when there are no workflows and no filters', () => {
      mockUseWorkflows.mockReturnValue({
        data: { results: [], total: 0, ...defaultSearch },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent({ search: { ...defaultSearch } });
      expect(screen.getByTestId('workflows-empty-state')).toBeInTheDocument();
    });

    it('does not show empty state when filters are applied even with no results', () => {
      mockUseWorkflows.mockReturnValue({
        data: { results: [], total: 0, ...defaultSearch },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent({ search: { ...defaultSearch, query: 'test-filter' } });
      // Should not show the empty state because a query filter is applied
      expect(screen.queryByTestId('workflows-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('with workflow data', () => {
    it('renders the workflows table', () => {
      renderComponent();
      expect(screen.getByTestId('workflowListTable')).toBeInTheDocument();
    });

    it('renders the utility bar', () => {
      renderComponent();
      expect(screen.getByTestId('workflows-utility-bar')).toBeInTheDocument();
    });

    it('renders workflow names as links', () => {
      renderComponent();
      const nameLink = screen.getByTestId('workflowNameLink');
      expect(nameLink).toBeInTheDocument();
      expect(nameLink).toHaveTextContent('My Test Workflow');
    });

    it('renders workflow description', () => {
      renderComponent();
      expect(screen.getByText('A workflow for testing')).toBeInTheDocument();
    });

    it('shows "No description" for workflows without description', () => {
      mockUseWorkflows.mockReturnValue({
        data: createMockWorkflowListDto([createMockWorkflow({ description: '' })]),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('renders the enabled toggle switch', () => {
      renderComponent();
      const toggle = screen.getByTestId('workflowToggleSwitch-wf-1');
      expect(toggle).toBeInTheDocument();
    });

    it('renders multiple workflows', () => {
      const workflows = [
        createMockWorkflow({ id: 'wf-1', name: 'Workflow One' }),
        createMockWorkflow({ id: 'wf-2', name: 'Workflow Two' }),
        createMockWorkflow({ id: 'wf-3', name: 'Workflow Three' }),
      ];
      mockUseWorkflows.mockReturnValue({
        data: createMockWorkflowListDto(workflows),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.getByText('Workflow One')).toBeInTheDocument();
      expect(screen.getByText('Workflow Two')).toBeInTheDocument();
      expect(screen.getByText('Workflow Three')).toBeInTheDocument();
    });

    it('renders the WorkflowStatus indicator for invalid workflows', () => {
      mockUseWorkflows.mockReturnValue({
        data: createMockWorkflowListDto([createMockWorkflow({ valid: false, enabled: false })]),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });
      renderComponent();
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
  });

  describe('delete modal', () => {
    it('does not render the delete modal by default', () => {
      renderComponent();
      expect(screen.queryByTestId('workflows-delete-confirmation-modal')).not.toBeInTheDocument();
    });
  });

  describe('event-driven disabled banner', () => {
    it('does not show event-driven disabled banner when event-driven execution is enabled', () => {
      renderComponent();
      expect(
        screen.queryByTestId('workflows-event-driven-disabled-banner')
      ).not.toBeInTheDocument();
    });
  });
});
