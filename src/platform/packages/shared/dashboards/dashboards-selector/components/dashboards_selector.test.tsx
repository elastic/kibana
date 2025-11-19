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
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public';
import userEvent from '@testing-library/user-event';

const MOCK_FIRST_DASHBOARD_ID = 'dashboard-1';
const MOCK_SECOND_DASHBOARD_ID = 'dashboard-2';
const MOCK_FIRST_DASHBOARD_TITLE = 'First Dashboard';
const MOCK_SECOND_DASHBOARD_TITLE = 'Second Dashboard';
const MOCK_PLACEHOLDER = 'Select a dashboard';

const MOCK_FIRST_DASHBOARD = {
  id: MOCK_FIRST_DASHBOARD_ID,
  attributes: { title: MOCK_FIRST_DASHBOARD_TITLE },
};

const MOCK_SECOND_DASHBOARD = {
  id: MOCK_SECOND_DASHBOARD_ID,
  attributes: { title: MOCK_SECOND_DASHBOARD_TITLE },
};

const mockFetchDashboard = jest.fn();
const mockFetchDashboards = jest
  .fn()
  .mockResolvedValue([MOCK_FIRST_DASHBOARD, MOCK_SECOND_DASHBOARD]);

// Mock the dashboard service
jest.mock('../services/dashboard_service', () => ({
  dashboardServiceProvider: jest.fn(() => ({
    fetchDashboards: (options: { search?: string; limit?: number }) => mockFetchDashboards(options),
    fetchDashboard: (id: string) => mockFetchDashboard(id),
  })),
}));

const mockOnChange = jest.fn();

describe('DashboardsSelector', () => {
  beforeEach(() => {
    mockFetchDashboard.mockResolvedValueOnce(MOCK_FIRST_DASHBOARD);
    mockFetchDashboard.mockResolvedValueOnce(MOCK_SECOND_DASHBOARD);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUiActions = {
    getAction: jest.fn(),
  } as unknown as UiActionsPublicStart;

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

    // Verify that fetchDashboard was called for each dashboard ID
    expect(mockFetchDashboard).toHaveBeenCalledWith(MOCK_FIRST_DASHBOARD_ID);
    expect(mockFetchDashboard).toHaveBeenCalledWith(MOCK_SECOND_DASHBOARD_ID);
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

    // Assert that fetchDashboards was called with the correct search value
    // Wait for the next tick to allow state update and effect to run
    await waitFor(() => {
      expect(searchInput).toHaveValue(MOCK_FIRST_DASHBOARD_TITLE);

      expect(mockFetchDashboards).toHaveBeenCalledWith(
        expect.objectContaining({ search: MOCK_FIRST_DASHBOARD_TITLE, limit: 100 })
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
      expect(mockFetchDashboards).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
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

    expect(mockFetchDashboards).not.toHaveBeenCalled();
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
      expect(mockFetchDashboards).toHaveBeenCalled();
      // When search value is empty, search should be undefined
      const lastCall = mockFetchDashboards.mock.calls[mockFetchDashboards.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(expect.objectContaining({ limit: 100 }));
      expect(lastCall[0].search).toBeUndefined();
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
});
