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
import { RuleDashboards } from './rule_dashboards';

const mockOnChange = jest.fn();

// Mock hooks
jest.mock('../hooks', () => ({
  useRuleFormState: jest.fn(),
  useRuleFormDispatch: jest.fn(),
}));

jest.mock('./dashboard_service', () => ({
  dashboardServiceProvider: jest.fn().mockReturnValue({
    fetchDashboard: jest.fn().mockImplementation(async (id: string) => {
      return {
        attributes: { title: `Dashboard ${id}` },
      };
    }),
    fetchDashboards: jest.fn().mockResolvedValue([
      {
        id: '1',
        attributes: { title: 'Dashboard 1' },
      },
      {
        id: '2',
        attributes: { title: 'Dashboard 2' },
      },
    ]),
  }),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const { dashboardServiceProvider: mockDashboardServiceProvider } =
  jest.requireMock('./dashboard_service');

describe('RuleDashboards', () => {
  const plugins = {
    featureFlags: {
      getBooleanValue: jest.fn(),
      appendContext: jest.fn(),
      getStringValue: jest.fn(),
      getNumberValue: jest.fn(),
      getBooleanValue$: jest.fn(),
      getStringValue$: jest.fn(),
      getNumberValue$: jest.fn(),
    },
    dashboard: {
      findDashboardsService: jest.fn(),
      registerDashboardPanelPlacementSetting: jest.fn(),
    },
  };
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

  it('does not render linked dashboards combo box when feature flag is disabled', () => {
    plugins.featureFlags.getBooleanValue.mockReturnValue(false);

    render(<RuleDashboards plugins={plugins} />);

    expect(screen.queryByText(/Link dashboard\(s\)/i)).not.toBeInTheDocument();
    expect(mockDashboardServiceProvider).not.toHaveBeenCalled();
    expect(mockDashboardServiceProvider().fetchDashboards).not.toHaveBeenCalled();
    expect(mockDashboardServiceProvider().fetchDashboard).not.toHaveBeenCalled();
  });

  it('renders linked dashboards combo box when feature flag is enabled', async () => {
    plugins.featureFlags.getBooleanValue.mockReturnValue(true);

    render(
      <IntlProvider locale="en">
        <RuleDashboards plugins={plugins} />
      </IntlProvider>
    );

    expect(screen.getByText('Link dashboards')).toBeInTheDocument();
    expect(useRuleFormState).toHaveBeenCalledTimes(1);
    expect(useRuleFormDispatch).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboard).not.toHaveBeenCalled();
  });

  it('fetches and displays dashboard titles', async () => {
    plugins.featureFlags.getBooleanValue.mockReturnValue(true);

    useRuleFormState.mockReturnValue({
      formData: {
        attachments: {
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
        <RuleDashboards plugins={plugins} />
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
    plugins.featureFlags.getBooleanValue.mockReturnValue(true);

    useRuleFormState.mockReturnValue({
      formData: {
        attachments: {
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
        <RuleDashboards plugins={plugins} />
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
        property: 'attachments',
        value: { dashboards: [{ id: '1' }, { id: '2' }] },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.getByText('Dashboard 2')).toBeInTheDocument();
    });
  });
});
