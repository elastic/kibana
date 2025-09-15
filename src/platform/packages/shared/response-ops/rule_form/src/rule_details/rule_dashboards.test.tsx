/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { RuleDashboards } from './rule_dashboards';
import { ALERT_LINK_DASHBOARDS_PLACEHOLDER } from '../translations';

const mockOnChange = jest.fn();

// Mock hooks
jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('../common/services/dashboard_service', () => ({
  dashboardServiceProvider: jest.fn().mockReturnValue({
    fetchDashboard: jest.fn().mockImplementation(async (id: string) => {
      return {
        attributes: { title: `Dashboard ${id}` },
        status: 'success',
      };
    }),
    fetchDashboards: jest.fn().mockResolvedValue([
      {
        id: '1',
        attributes: { title: 'Dashboard 1' },
        status: 'success',
      },
      {
        id: '2',
        attributes: { title: 'Dashboard 2' },
        status: 'success',
      },
    ]),
  }),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const { dashboardServiceProvider: mockDashboardServiceProvider } = jest.requireMock(
  '../common/services/dashboard_service'
);

describe('RuleDashboards', () => {
  const contentManagement = contentManagementMock.createStartContract();
  beforeEach(() => {
    useRuleFormDispatch.mockReturnValue(mockOnChange);
    useRuleFormState.mockReturnValue({
      formData: {
        artifacts: {
          dashboards: [
            {
              id: '1',
            },
          ],
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders linked dashboards combo box', async () => {
    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Related dashboards')).toBeInTheDocument();
      expect(useRuleFormState).toHaveBeenCalled();
      expect(useRuleFormDispatch).toHaveBeenCalled();
    });
  });

  it('fetches and displays selected dashboard titles', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        artifacts: {
          dashboards: [
            {
              id: '1',
            },
          ],
        },
      },
    });

    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(mockDashboardServiceProvider().fetchDashboards).not.toHaveBeenCalled();
      expect(mockDashboardServiceProvider().fetchDashboard).toHaveBeenCalled();
    });
  });

  it('dispatches selected dashboards on change', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        artifacts: {
          dashboards: [
            {
              id: '1',
            },
          ],
        },
      },
    });

    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard 2')).not.toBeInTheDocument();
      expect(mockDashboardServiceProvider().fetchDashboards).not.toHaveBeenCalled();
      expect(mockDashboardServiceProvider().fetchDashboard).toHaveBeenCalled();
    });

    // Simulate selecting an option in the EuiComboBox
    const inputWrap = screen
      .getByTestId('ruleLinkedDashboards')
      .querySelector('.euiComboBox__inputWrap');
    if (inputWrap) {
      await userEvent.click(inputWrap);
    }
    await userEvent.click(screen.getByText('Dashboard 2'));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'setRuleProperty',
        payload: {
          property: 'artifacts',
          value: { dashboards: [{ id: '1' }, { id: '2' }] },
        },
      });
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.getByText('Dashboard 2')).toBeInTheDocument();
    });
  });

  it('does not fetch dashboard list when combobox is not focused', async () => {
    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(mockDashboardServiceProvider().fetchDashboards).not.toHaveBeenCalled();
    });
  });

  it('fetches dashboard list when combobox is focused', async () => {
    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );
    const searchInput = screen.getByPlaceholderText(ALERT_LINK_DASHBOARDS_PLACEHOLDER);
    fireEvent.focus(searchInput);

    await waitFor(() => {
      expect(mockDashboardServiceProvider).toHaveBeenCalled();
      expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalled();
    });
  });

  it('debounces and triggers dashboard search with user input in the ComboBox', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        artifacts: {
          dashboards: [
            {
              id: '1',
            },
          ],
        },
      },
    });

    render(
      <IntlProvider locale="en">
        <RuleDashboards contentManagement={contentManagement} />
      </IntlProvider>
    );

    const searchInput = screen.getByPlaceholderText(ALERT_LINK_DASHBOARDS_PLACEHOLDER);
    await userEvent.type(searchInput, 'Dashboard 1');

    // Assert that fetchDashboards was called with the correct search value
    // Wait for the next tick to allow state update and effect to run
    await waitFor(() => {
      expect(searchInput).toHaveValue('Dashboard 1');

      expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, text: 'Dashboard 1*' })
      );

      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard 2')).not.toBeInTheDocument();
    });
  });
});
