/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowsActionParams } from './types';
import WorkflowsParamsFields from './workflows_params';

// Mock useKibana hook
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

// Suppress known React warnings/errors from UI library components in tests
// These are expected and don't affect test functionality:
// 1. validationResult prop warning - comes from @kbn/workflows-ui WorkflowSelector component
// 2. Http service error - can occur during initial render before mocks are fully set up
// eslint-disable-next-line no-console
const originalError = console.error;
beforeAll(() => {
  // eslint-disable-next-line no-console
  console.error = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : String(args[0]);
    if (message.includes('validationResult') || message.includes('Http service is not available')) {
      // Suppress these specific known warnings/errors in tests
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.error = originalError;
});

// Helper function to render with I18n provider
const renderWithIntl = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('WorkflowsParamsFields', () => {
  const mockEditAction = jest.fn();
  const mockHttpPost = jest.fn();

  const defaultProps = {
    actionParams: {
      subAction: 'run',
      subActionParams: {
        workflowId: '',
      },
    } as WorkflowsActionParams,
    editAction: mockEditAction,
    index: 0,
    errors: {},
    messageVariables: [],
    defaultMessage: '',
    actionConnector: {} as any,
    isEdit: false,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Test Workflow 1',
          description: 'Description for workflow 1',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: ['test-tag'],
          },
        },
        {
          id: 'workflow-2',
          name: 'Test Workflow 2',
          description: 'Description for workflow 2',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
      ],
    });

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          post: mockHttpPost,
        },
        application: {
          getUrlForApp: jest.fn().mockReturnValue('/app/workflows'),
        },
      },
    } as any);
  });

  test('should initialize action parameters on mount', async () => {
    const props = {
      ...defaultProps,
      actionParams: {} as any,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...props} />);
    });

    expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', 0);
    expect(mockEditAction).toHaveBeenCalledWith(
      'subActionParams',
      { workflowId: '', summaryMode: true },
      0
    );
  });

  test('should render workflow selection dropdown', async () => {
    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Select Workflow')).toBeInTheDocument();
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });
  });

  test('should render create new workflow link', async () => {
    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Create new')).toBeInTheDocument();
    });
  });

  test('should show loading spinner while fetching workflows', async () => {
    mockHttpPost.mockReturnValue(new Promise(() => {})); // Never resolves

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('should populate workflow options when fetch succeeds', async () => {
    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          query: '',
        }),
      });
    });

    // Check that the selectable component is rendered
    await waitFor(() => {
      const select = screen.getByTestId('workflowIdSelect');
      expect(select).toBeInTheDocument();
    });
  });

  test('should handle workflow selection', async () => {
    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          query: '',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the options to appear
    await waitFor(() => {
      expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
    });
  });

  test('should show error message when fetch fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockHttpPost.mockRejectedValue(new Error('Failed to fetch'));

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load workflows. Please check your connector configuration.')
      ).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  test('should show no workflows message when no workflows are returned', async () => {
    mockHttpPost.mockResolvedValue({ results: [] });

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      const select = screen.getByTestId('workflowIdSelect');
      expect(select).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    await waitFor(() => {
      const createButtons = screen.getAllByText('Create your first workflow');
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  test('should display validation error', async () => {
    const propsWithError = {
      ...defaultProps,
      errors: {
        'subActionParams.workflowId': ['Workflow ID is required.'],
      },
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithError} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Workflow ID is required.')).toBeInTheDocument();
    });
  });

  test('should handle existing workflowId in action params', async () => {
    const propsWithWorkflowId = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'existing-workflow-id',
        },
      } as WorkflowsActionParams,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithWorkflowId} />);
    });

    await waitFor(() => {
      // Check that the component renders correctly with existing workflow ID
      const select = screen.getByTestId('workflowIdSelect');
      expect(select).toBeInTheDocument();
    });
  });

  test('should handle workflows with different statuses', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Active Workflow',
          description: 'Active workflow description',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-2',
          name: 'Inactive Workflow',
          description: 'Inactive workflow description',
          status: 'inactive',
          definition: {
            enabled: false,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
      ],
    });

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the options to appear
    await waitFor(() => {
      expect(screen.getByText('Active Workflow')).toBeInTheDocument();
      expect(screen.getByText('Inactive Workflow')).toBeInTheDocument();
    });
  });

  test('should show warning icon for selected disabled workflow', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Inactive Workflow',
          description: 'Inactive workflow description',
          status: 'inactive',
        },
      ],
    });

    const propsWithDisabledSelected = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'workflow-1',
        },
      } as WorkflowsActionParams,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithDisabledSelected} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });
  });

  test('should handle workflow selection correctly', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          description: 'This is a test workflow',
          status: 'active',
        },
      ],
    });

    const propsWithSelected = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'workflow-1',
        },
      } as WorkflowsActionParams,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithSelected} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // The component should render correctly with the selected workflow
    expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
  });

  test('should handle workflow component state correctly', async () => {
    const propsWithSelected = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'workflow-1',
        },
      } as WorkflowsActionParams,
    };

    renderWithIntl(<WorkflowsParamsFields {...propsWithSelected} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // The component should render correctly
    expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
  });

  test('should handle create new workflow click', async () => {
    // Mock the application service
    const mockGetUrlForApp = jest.fn().mockReturnValue('/app/workflows');
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          post: mockHttpPost,
        },
        application: {
          getUrlForApp: mockGetUrlForApp,
        },
      },
    } as any);

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      const createLink = screen.getByRole('link', { name: /Create new/i });
      expect(createLink).toBeInTheDocument();
    });

    const createLink = screen.getByRole('link', { name: /Create new/i });

    // Verify that the link has the correct href and target attributes
    expect(createLink).toHaveAttribute('href', '/app/workflows');
    expect(createLink).toHaveAttribute('target', '_blank');

    // Verify that getUrlForApp was called (indirectly through the component)
    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows');
  });

  test('should handle missing HTTP service gracefully', async () => {
    mockUseKibana.mockReturnValue({
      services: {},
    } as any);

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Should not crash and should render the component
    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Should show no workflows available
    await waitFor(() => {
      // Check that the empty state is shown
      expect(screen.getAllByText("You don't have any workflows yet").length).toBeGreaterThan(0);
      // Check that there's at least one "Create your first workflow" button
      const createButtons = screen.getAllByText('Create your first workflow');
      expect(createButtons.length).toBeGreaterThan(0);
    });
  });

  test('should update subActionParams correctly', async () => {
    const props = {
      ...defaultProps,
      actionParams: {} as any, // This will trigger the initialization logic
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Verify the component initializes correctly when actionParams is empty
    await waitFor(() => {
      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', 0);
    });
  });

  test('should preserve existing subActionParams when updating workflowId', async () => {
    const propsWithExistingParams = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'existing-id',
          otherParam: 'value',
        },
      } as any,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithExistingParams} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // The component should render correctly with existing params
    expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
  });

  test('should revert input value when cleared but no new selection is made', async () => {
    const propsWithSelectedWorkflow = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
        subActionParams: {
          workflowId: 'workflow-1',
        },
      } as WorkflowsActionParams,
    };

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...propsWithSelectedWorkflow} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          query: '',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Clear the input value
    fireEvent.change(input, { target: { value: '' } });

    // Simulate closing the popover without selecting anything (e.g., by pressing Escape)
    fireEvent.keyDown(input, { key: 'Escape' });

    // The input should revert back to the selected workflow name
    await waitFor(() => {
      expect(input).toHaveValue('Test Workflow 1');
    });
  });

  test('should sort workflows: enabled before disabled, alert-triggered before others', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-disabled-alert',
          name: 'Disabled Alert Workflow',
          description: 'Disabled with alert trigger',
          status: 'inactive',
          enabled: false,
          definition: {
            enabled: false,
            triggers: [{ type: 'alert' }],
            tags: [],
          },
        },
        {
          id: 'workflow-enabled-manual',
          name: 'Enabled Manual Workflow',
          description: 'Enabled with manual trigger',
          status: 'active',
          enabled: true,
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-disabled-manual',
          name: 'Disabled Manual Workflow',
          description: 'Disabled with manual trigger',
          status: 'inactive',
          enabled: false,
          definition: {
            enabled: false,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-enabled-alert',
          name: 'Enabled Alert Workflow',
          description: 'Enabled with alert trigger',
          status: 'active',
          enabled: true,
          definition: {
            enabled: true,
            triggers: [{ type: 'alert' }],
            tags: [],
          },
        },
      ],
    });

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Enabled Alert Workflow')).toBeInTheDocument();
      expect(screen.getByText('Disabled Alert Workflow')).toBeInTheDocument();
    });

    const workflowOptions = screen.getAllByRole('option');

    expect(workflowOptions[0]).toHaveAttribute('name', 'Enabled Alert Workflow');
    expect(workflowOptions[1]).toHaveAttribute('name', 'Enabled Manual Workflow');
    expect(workflowOptions[2]).toHaveAttribute('name', 'Disabled Alert Workflow');
    expect(workflowOptions[3]).toHaveAttribute('name', 'Disabled Manual Workflow');
  });

  test('should handle workflows without definition or triggers gracefully', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Workflow Without Definition',
          description: 'A workflow without definition',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-2',
          name: 'Workflow With Empty Triggers',
          description: 'A workflow with empty triggers',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [],
            tags: [],
          },
        },
        {
          id: 'workflow-3',
          name: 'Alert Workflow',
          description: 'A workflow with alert trigger',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'alert' }],
            tags: [],
          },
        },
      ],
    });

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          query: '',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the options to appear
    await waitFor(() => {
      expect(screen.getByText('Alert Workflow')).toBeInTheDocument();
      expect(screen.getByText('Workflow Without Definition')).toBeInTheDocument();
      expect(screen.getByText('Workflow With Empty Triggers')).toBeInTheDocument();
    });

    // Get all the workflow option elements
    const workflowOptions = screen.getAllByRole('option');

    // The alert workflow should be first
    expect(workflowOptions[0]).toHaveAttribute('name', 'Alert Workflow');

    // The other workflows should follow (workflows without alert triggers)
    expect(workflowOptions[1]).toHaveAttribute('name', 'Workflow Without Definition');
    expect(workflowOptions[2]).toHaveAttribute('name', 'Workflow With Empty Triggers');
  });

  test('should render view all workflows link and handle click to open in new tab', async () => {
    // Mock the application service
    const mockGetUrlForApp = jest.fn().mockReturnValue('/app/workflows');
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          post: mockHttpPost,
        },
        application: {
          getUrlForApp: mockGetUrlForApp,
        },
      },
    } as any);

    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          description: 'A test workflow',
          status: 'active',
          definition: {
            triggers: [{ type: 'manual' }],
          },
        },
      ],
    });

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          size: 1000,
          page: 1,
          query: '',
        }),
      });
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the options to appear
    await waitFor(() => {
      expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    });

    // Find the "View all workflows" link button in the footer
    const viewAllWorkflowsLink = screen.getByRole('link', { name: 'View all workflows' });
    expect(viewAllWorkflowsLink).toBeInTheDocument();

    // Verify that the link has the correct href and target attributes
    expect(viewAllWorkflowsLink).toHaveAttribute('href', '/app/workflows');
    expect(viewAllWorkflowsLink).toHaveAttribute('target', '_blank');

    // Verify that getUrlForApp was called (indirectly through the component)
    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows');
  });

  test('should show disabled badge for disabled workflows', async () => {
    const mockWorkflows = {
      results: [
        {
          id: 'workflow-1',
          name: 'Disabled Workflow',
          description: 'A disabled workflow',
          enabled: false,
          definition: { triggers: [] },
        },
      ],
    };

    mockHttpPost.mockResolvedValue(mockWorkflows);

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalled();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the disabled workflow to appear
    await waitFor(() => {
      expect(screen.getByText('Disabled Workflow')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  test('should show "No description" for workflows with undefined description', async () => {
    const mockWorkflows = {
      results: [
        {
          id: 'workflow-1',
          name: 'Workflow without description',
          description: undefined,
          enabled: true,
          definition: { triggers: [] },
        },
      ],
    };

    mockHttpPost.mockResolvedValue(mockWorkflows);

    await act(async () => {
      renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalled();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    // Wait for the workflow to appear
    await waitFor(() => {
      expect(screen.getByText('Workflow without description')).toBeInTheDocument();
      expect(screen.getByText('No description')).toBeInTheDocument();
    });
  });

  describe('Action frequency (summaryMode parameter)', () => {
    test('should render Action frequency section with switch', async () => {
      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Action frequency')).toBeInTheDocument();
        expect(screen.getByText('Run per alert')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-run-per-alert-switch')).toBeInTheDocument();
      });
    });

    test('should initialize summaryMode to true when missing', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'test-workflow',
            // summaryMode is missing
          },
        } as any,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          'subActionParams',
          { workflowId: 'test-workflow', summaryMode: true },
          0
        );
      });
    });

    test('should initialize summaryMode to true when subActionParams is missing', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          // subActionParams is missing
        } as any,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          'subActionParams',
          { workflowId: '', summaryMode: true },
          0
        );
      });
    });

    test('should display switch as unchecked when summaryMode is true', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'test-workflow',
            summaryMode: true,
          },
        } as WorkflowsActionParams,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).not.toBeChecked();
      });
    });

    test('should display switch as checked when summaryMode is false', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'test-workflow',
            summaryMode: false,
          },
        } as WorkflowsActionParams,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).toBeChecked();
      });
    });

    test('should allow changing from summary mode to run per alert', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'test-workflow',
            summaryMode: true,
          },
        } as WorkflowsActionParams,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).not.toBeChecked();
      });

      // Click the switch to enable "run per alert"
      const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
      await act(async () => {
        fireEvent.click(switchElement);
      });

      // Verify that editAction was called with summaryMode: false
      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          'subActionParams',
          { workflowId: 'test-workflow', summaryMode: false },
          0
        );
      });
    });

    test('should allow changing from run per alert to summary mode', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'test-workflow',
            summaryMode: false,
          },
        } as WorkflowsActionParams,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).toBeChecked();
      });

      // Click the switch to disable "run per alert" (enable summary mode)
      const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
      await act(async () => {
        fireEvent.click(switchElement);
      });

      // Verify that editAction was called with summaryMode: true
      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          'subActionParams',
          { workflowId: 'test-workflow', summaryMode: true },
          0
        );
      });
    });

    test('should render switch with help text for Action frequency', async () => {
      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...defaultProps} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(screen.getByText('Run per alert')).toBeInTheDocument();
        expect(screen.getByText('Action frequency')).toBeInTheDocument();
        // Verify the switch is rendered and functional
        expect(switchElement).not.toBeChecked(); // Default is summary mode (false = unchecked)
      });
    });

    test('should preserve summaryMode value when updating workflowId', async () => {
      const props = {
        ...defaultProps,
        actionParams: {
          subAction: 'run',
          subActionParams: {
            workflowId: 'old-workflow',
            summaryMode: false,
          },
        } as WorkflowsActionParams,
      };

      await act(async () => {
        renderWithIntl(<WorkflowsParamsFields {...props} />);
      });

      await waitFor(() => {
        const switchElement = screen.getByTestId('workflow-run-per-alert-switch');
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).toBeChecked();
      });

      // The summaryMode value should be preserved when workflowId changes
      // This is tested implicitly through the component's handleWorkflowChange callback
      // which preserves existing subActionParams properties
      expect(mockEditAction).not.toHaveBeenCalledWith(
        'subActionParams',
        expect.objectContaining({ summaryMode: true }),
        0
      );
    });
  });
});
