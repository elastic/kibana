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

const mockSearchExecute = jest.fn((context: any) => {
  if (context.onResults) {
    context.onResults([MOCK_FIRST_DASHBOARD, MOCK_SECOND_DASHBOARD]);
  }
});

const mockGetByIdExecute = jest.fn((context: any) => {
  if (context.onResults && context.ids) {
    const requestedDashboards = context.ids
      .map((id: string) => {
        if (id === MOCK_FIRST_DASHBOARD_ID) return MOCK_FIRST_DASHBOARD;
        if (id === MOCK_SECOND_DASHBOARD_ID) return MOCK_SECOND_DASHBOARD;
        return null;
      })
      .filter(Boolean);
    context.onResults(requestedDashboards);
  }
});

const mockSearchAction = {
  execute: mockSearchExecute,
};

const mockGetDashboardsByIdsAction = {
  execute: mockGetByIdExecute,
};

const mockGetAction = jest.fn((actionId: string) => {
  if (actionId === 'getDashboardsByIdsAction') {
    return Promise.resolve(mockGetDashboardsByIdsAction);
  }
  return Promise.resolve(mockSearchAction);
});

const mockOnChange = jest.fn();

describe('DashboardsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAction.mockImplementation((actionId: string) => {
      if (actionId === 'getDashboardsByIdsAction') {
        return Promise.resolve(mockGetDashboardsByIdsAction);
      }
      return Promise.resolve(mockSearchAction);
    });
    mockSearchExecute.mockImplementation((context: any) => {
      if (context.onResults) {
        context.onResults([MOCK_FIRST_DASHBOARD, MOCK_SECOND_DASHBOARD]);
      }
    });
    mockGetByIdExecute.mockImplementation((context: any) => {
      if (context.onResults && context.ids) {
        const requestedDashboards = context.ids
          .map((id: string) => {
            if (id === MOCK_FIRST_DASHBOARD_ID) return MOCK_FIRST_DASHBOARD;
            if (id === MOCK_SECOND_DASHBOARD_ID) return MOCK_SECOND_DASHBOARD;
            return null;
          })
          .filter(Boolean);
        context.onResults(requestedDashboards);
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

    await waitFor(() => {
      expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
      expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
    });

    expect(mockGetAction).toHaveBeenCalledWith('getDashboardsByIdsAction');
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

    await waitFor(() => {
      expect(searchInput).toHaveValue(MOCK_FIRST_DASHBOARD_TITLE);

      expect(mockSearchExecute).toHaveBeenCalledWith(
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
      expect(mockSearchExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          search: {
            search: '',
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

    expect(mockSearchExecute).not.toHaveBeenCalled();
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

    const searchInput = screen.getByPlaceholderText(MOCK_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(mockSearchExecute).toHaveBeenCalled();
      expect(mockSearchExecute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: {
            search: '',
            per_page: 100,
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { label: MOCK_FIRST_DASHBOARD_TITLE, value: MOCK_FIRST_DASHBOARD_ID },
        { label: MOCK_SECOND_DASHBOARD_TITLE, value: MOCK_SECOND_DASHBOARD_ID },
      ]);
    });

    expect(screen.getByText(MOCK_FIRST_DASHBOARD_TITLE)).toBeInTheDocument();
    expect(screen.getByText(MOCK_SECOND_DASHBOARD_TITLE)).toBeInTheDocument();
  });

  it('removes invalid dashboard ids from form data', async () => {
    render(
      <DashboardsSelector
        uiActions={mockUiActions}
        dashboardsFormData={[{ id: 'invalid-id' }, { id: MOCK_SECOND_DASHBOARD_ID }]}
        onChange={mockOnChange}
        placeholder={MOCK_PLACEHOLDER}
      />
    );

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([
        { label: MOCK_SECOND_DASHBOARD_TITLE, value: MOCK_SECOND_DASHBOARD_ID },
      ]);
    });
  });
});
