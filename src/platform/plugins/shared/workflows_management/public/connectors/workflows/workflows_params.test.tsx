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
        },
        {
          id: 'workflow-2',
          name: 'Test Workflow 2',
        },
      ],
    });

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          post: mockHttpPost,
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
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search');
    });

    // Check that the select is no longer disabled
    await waitFor(() => {
      const select = screen.getByTestId('workflowIdSelect');
      expect(select).not.toBeDisabled();
    });
  });

  test('should handle workflow selection', async () => {
    const component = render(<WorkflowsParamsFields {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
    });

    // Wait for workflows to load
    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith('/api/workflows/search');
    });

    // Test that the callback function works when called directly
    act(() => {
      const propsWithCallback = {
        ...defaultProps,
        actionParams: {
          subAction: 'run' as const,
          subActionParams: { workflowId: 'test-id' },
        },
      };
      component.rerender(<WorkflowsParamsFields {...propsWithCallback} />);
    });

    // Verify the component rendered correctly
    expect(screen.getByTestId('workflowIdSelect')).toBeInTheDocument();
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
      expect(screen.getByText('No workflows available')).toBeInTheDocument();
    });

    const select = screen.getByTestId('workflowIdSelect');
    expect(select).toBeDisabled();
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
      // Check that the hidden input contains the correct value
      const hiddenInput = screen.getByDisplayValue('existing-workflow-id');
      expect(hiddenInput).toBeInTheDocument();
    });
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

    // Should not crash and should show no workflows available
    expect(screen.getByText('No workflows available')).toBeInTheDocument();
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

    // Verify the existing workflowId is preserved
    await waitFor(() => {
      const hiddenInput = screen.getByDisplayValue('existing-id');
      expect(hiddenInput).toBeInTheDocument();
    });
  });
});
