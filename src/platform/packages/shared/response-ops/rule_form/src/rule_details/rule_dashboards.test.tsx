/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { RuleDashboards } from './rule_dashboards';

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
        params: {
          dashboards: [],
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

    expect(screen.getByText('Related dashboards')).toBeInTheDocument();
    expect(useRuleFormState).toHaveBeenCalledTimes(1);
    expect(useRuleFormDispatch).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboard).not.toHaveBeenCalled();
  });

  it('fetches and displays dashboard titles', async () => {
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
      expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalled();
      expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalledTimes(1);
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
      expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalled();
      expect(mockDashboardServiceProvider().fetchDashboard).toHaveBeenCalled();
    });

    // Simulate selecting an option in the EuiComboBox
    const inputWrap = screen
      .getByTestId('ruleLinkedDashboards')
      .querySelector('.euiComboBox__inputWrap');
    if (inputWrap) {
      fireEvent.click(inputWrap);
    }
    fireEvent.click(screen.getByText('Dashboard 2'));

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setRuleProperty',
      payload: {
        property: 'artifacts',
        value: { dashboards: [{ id: '1' }, { id: '2' }] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.getByText('Dashboard 2')).toBeInTheDocument();
    });
  });
});
