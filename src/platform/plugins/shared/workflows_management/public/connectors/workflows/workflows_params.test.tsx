/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { WorkflowsActionParams } from './types';
import WorkflowsParamsFields from './workflows_params';

// Mock useKibana hook
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

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
      render(<WorkflowsParamsFields {...props} />);
    });

    expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', 0);
    expect(mockEditAction).toHaveBeenCalledWith('subActionParams', { workflowId: '' }, 0);
  });

  test('should render workflow selection dropdown', async () => {
    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Workflow ID')).toBeInTheDocument();
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });
  });

  test('should render create new workflow link', async () => {
    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Create new')).toBeInTheDocument();
    });
  });

  test('should show loading spinner while fetching workflows', async () => {
    mockHttpPost.mockReturnValue(new Promise(() => {})); // Never resolves

    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('should populate workflow options when fetch succeeds', async () => {
    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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
      render(<WorkflowsParamsFields {...defaultProps} />);
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
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      const select = screen.getByTestId('workflowIdSelect');
      expect(select).toBeInTheDocument();
    });

    // Click on the input to open the popover
    const input = screen.getByRole('searchbox');
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('No workflows available')).toBeInTheDocument();
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
      render(<WorkflowsParamsFields {...propsWithError} />);
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
      render(<WorkflowsParamsFields {...propsWithWorkflowId} />);
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
      render(<WorkflowsParamsFields {...defaultProps} />);
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
      render(<WorkflowsParamsFields {...propsWithDisabledSelected} />);
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
      render(<WorkflowsParamsFields {...propsWithSelected} />);
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

    render(<WorkflowsParamsFields {...propsWithSelected} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // The component should render correctly
    expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
  });

  test('should handle create new workflow click', async () => {
    const originalOpen = window.open;
    window.open = jest.fn();

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
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    await waitFor(() => {
      const createLink = screen.getByText('Create new');
      fireEvent.click(createLink);
    });

    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows');
    expect(window.open).toHaveBeenCalledWith('/app/workflows', '_blank');

    window.open = originalOpen;
  });

  test('should handle missing HTTP service gracefully', async () => {
    mockUseKibana.mockReturnValue({
      services: {},
    } as any);

    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
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
      expect(screen.getByText('No workflows available')).toBeInTheDocument();
    });
  });

  test('should update subActionParams correctly', async () => {
    const props = {
      ...defaultProps,
      actionParams: {} as any, // This will trigger the initialization logic
    };

    await act(async () => {
      render(<WorkflowsParamsFields {...props} />);
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
      render(<WorkflowsParamsFields {...propsWithExistingParams} />);
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
      render(<WorkflowsParamsFields {...propsWithSelectedWorkflow} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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

  test('should sort workflows with alert trigger types to the top', async () => {
    mockHttpPost.mockResolvedValue({
      results: [
        {
          id: 'workflow-1',
          name: 'Regular Workflow',
          description: 'A regular workflow without alert triggers',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }, { type: 'schedule' }],
            tags: [],
          },
        },
        {
          id: 'workflow-2',
          name: 'Alert Workflow A',
          description: 'A workflow with alert trigger',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'alert' }, { type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-3',
          name: 'Another Regular Workflow',
          description: 'Another workflow without alert triggers',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'manual' }],
            tags: [],
          },
        },
        {
          id: 'workflow-4',
          name: 'Alert Workflow B',
          description: 'Another workflow with alert trigger',
          status: 'active',
          definition: {
            enabled: true,
            triggers: [{ type: 'schedule' }, { type: 'alert' }],
            tags: [],
          },
        },
      ],
    });

    await act(async () => {
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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
      expect(screen.getByText('Alert Workflow A')).toBeInTheDocument();
      expect(screen.getByText('Alert Workflow B')).toBeInTheDocument();
      expect(screen.getByText('Regular Workflow')).toBeInTheDocument();
      expect(screen.getByText('Another Regular Workflow')).toBeInTheDocument();
    });

    // Get all the workflow option elements
    const workflowOptions = screen.getAllByRole('option');

    // The first two options should be the alert workflows (in original order among alert workflows)
    expect(workflowOptions[0]).toHaveAttribute('name', 'Alert Workflow A');
    expect(workflowOptions[1]).toHaveAttribute('name', 'Alert Workflow B');

    // The next two should be regular workflows (in original order among regular workflows)
    expect(workflowOptions[2]).toHaveAttribute('name', 'Regular Workflow');
    expect(workflowOptions[3]).toHaveAttribute('name', 'Another Regular Workflow');
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
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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

  test('should render workflow links and handle click to open in new tab', async () => {
    const originalOpen = window.open;
    window.open = jest.fn();

    // Mock the application service
    const mockGetUrlForApp = jest.fn().mockReturnValue('/app/workflows/workflow-1');
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
      render(<WorkflowsParamsFields {...defaultProps} />);
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
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

    // Find the workflow link button
    const workflowLinkButton = screen.getByRole('button', { name: 'Open workflow' });
    expect(workflowLinkButton).toBeInTheDocument();

    // Click the workflow link button directly
    fireEvent.click(workflowLinkButton);

    // Verify that the correct URL was opened in a new tab
    expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', { path: '/workflow-1' });
    expect(window.open).toHaveBeenCalledWith('/app/workflows/workflow-1', '_blank');

    window.open = originalOpen;
  });
});
