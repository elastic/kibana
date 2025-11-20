/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DashboardsSelector } from './dashboards_selector';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import userEvent from '@testing-library/user-event';

const MOCK_FIRST_DASHBOARD_ID = 'dashboard-1';
const MOCK_SECOND_DASHBOARD_ID = 'dashboard-2';
const MOCK_FIRST_DASHBOARD_TITLE = 'First Dashboard';
const MOCK_SECOND_DASHBOARD_TITLE = 'Second Dashboard';
const MOCK_PLACEHOLDER = 'Select a dashboard';

const MOCK_FIRST_DASHBOARD = {
  id: MOCK_FIRST_DASHBOARD_ID,
  isManaged: false,
  title: MOCK_FIRST_DASHBOARD_TITLE,
};

const MOCK_SECOND_DASHBOARD = {
  id: MOCK_SECOND_DASHBOARD_ID,
  isManaged: false,
  title: MOCK_SECOND_DASHBOARD_TITLE,
};

const mockExecute = jest.fn((context: any) => {
  if (context.onResults) {
    context.onResults([MOCK_FIRST_DASHBOARD, MOCK_SECOND_DASHBOARD]);
  }
});

const mockSearchAction = {
  execute: mockExecute,
};

const mockGetAction = jest.fn().mockResolvedValue(mockSearchAction);

const mockOnChange = jest.fn();

describe('DashboardsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAction.mockResolvedValue(mockSearchAction);
    mockExecute.mockImplementation((context: any) => {
      if (context.onResults) {
        context.onResults([MOCK_FIRST_DASHBOARD, MOCK_SECOND_DASHBOARD]);
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUiActions = {
    getAction: mockGetAction,
  } as unknown as UiActionsStart;

  it('renders the component', () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    // Check that the component renders with the placeholder text
    expect(screen.getByTestId('dashboardsSelector')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(MOCK_PLACEHOLDER)).toBeInTheDocument();
  });

  it('displays selected dashboard titles from dashboardsFormData', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[{ id: MOCK_FIRST_DASHBOARD_ID }, { id: MOCK_SECOND_DASHBOARD_ID }]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    // Wait for the dashboard titles to be fetched and displayed
    await waitFor(() => {
      expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
      expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
    });

    // Verify that searchDashboards was called to fetch all dashboards
    expect(mockGetAction).toHaveBeenCalledWith('searchDashboardAction');
  });

  it('debounces and triggers dashboard search with user input in the ComboBox', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    await userEvent.type(searchInput, MOCK_FIRST_DASHBOARD_TITLE);

    // Assert that searchDashboards was called with the correct search value
    // Wait for the next tick to allow state update and effect to run
    await waitFor(() => {
      expect(searchInput).toHaveValue(MOCK_FIRST_DASHBOARD_TITLE);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          search: {
            search: MOCK_FIRST_DASHBOARD_TITLE,
            per_page: 100,
          },
          trigger: { id: 'searchDashboards' },
        })
      );

      expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
    });
  });

  it('fetches dashboard list when combobox is focused', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );
    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          search: {
            search: undefined,
            per_page: 100,
          },
        })
      );
    });
  });

  it('does not fetch dashboard list when combobox is not focused', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('dispatches selected dashboards on change', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[{ id: MOCK_FIRST_DASHBOARD_ID }]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    // Click on the combobox to open it
    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    // Wait for the dropdown to open and options to load
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
      // When search value is empty, search should be undefined
      const lastCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(
        expect.objectContaining({
          search: {
            search: undefined,
            per_page: 100,
          },
        })
      );
    });

    // Wait for the second dashboard option to appear in the dropdown
    await waitFor(() => {
      expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
    });

    // Click on the second dashboard option to select it
    await userEvent.click(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE));

    // Verify that the onChange callback was called with both dashboards
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { label: MOCK_FIRST_DASHBOARD_TITLE, value: MOCK_FIRST_DASHBOARD_ID },
        { label: MOCK_SECOND_DASHBOARD_TITLE, value: MOCK_SECOND_DASHBOARD_ID },
      ]);
    });

    // Verify that both selected options are now displayed
    expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
    expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
  });

  /**
   * CRITICAL TEST: This test would have caught the regression where the dropdown was empty.
   * It verifies that when the combobox is opened, it actually displays options in the dropdown.
   */
  it('displays dashboard options in dropdown when combobox is opened', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);

    // Open the combobox
    fireEvent.focus(searchInput);

    // Wait for options to appear in the dropdown
    // This is the key assertion - the dropdown should NOT be empty
    await waitFor(
      () => {
        // Verify the UI action was called
        expect(mockGetAction).toHaveBeenCalledWith('searchDashboardAction');
        expect(mockExecute).toHaveBeenCalled();

        // CRITICAL: Verify options are actually visible in the dropdown
        // This would fail if the dropdown was empty (the bug scenario)
        expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
        expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  /**
   * This test verifies the component handles the case when no dashboards are returned.
   * It should not crash and should show an empty state gracefully.
   */
  it('handles empty dashboard results gracefully', async () => {
    const emptyMockExecute = jest.fn((context: any) => {
      if (context.onResults) {
        context.onResults([]);
      }
    });

    const emptyMockSearchAction = {
      execute: emptyMockExecute,
    };

    const emptyMockUiActions = {
      getAction: jest.fn().mockResolvedValue(emptyMockSearchAction),
    } as unknown as UiActionsStart;

    render(
      <DashboardsSelector
        uiActions={emptyMockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(emptyMockExecute).toHaveBeenCalled();
    });

    // Component should still render without crashing
    expect(screen.getByTestId('dashboardsSelector')).toBeInTheDocument();
  });

  /**
   * This test verifies the component handles UI action errors gracefully.
   * This would catch issues where the UI action fails to execute.
   */
  it('handles UI action errors gracefully', async () => {
    const errorMockUiActions = {
      getAction: jest.fn().mockRejectedValue(new Error('Action not found')),
    } as unknown as UiActionsStart;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <DashboardsSelector
        uiActions={errorMockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(errorMockUiActions.getAction).toHaveBeenCalledWith('searchDashboardAction');
    });

    // Component should handle error and log it
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading dashboards:', expect.any(Error));
    });

    // Component should still render without crashing
    expect(screen.getByTestId('dashboardsSelector')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  /**
   * This test verifies that the UI action is called with the correct trigger ID.
   * This would catch issues where the wrong action or trigger is used.
   */
  it('calls UI action with correct trigger ID', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: { id: 'searchDashboards' },
        })
      );
    });
  });
});
