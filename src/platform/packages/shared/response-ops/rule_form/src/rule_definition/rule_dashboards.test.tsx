import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleDashboards } from './rule_dashboards';
// import { dashboardServiceProvider } from './dashboard_service';

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
      }
    ])
  }),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const { dashboardServiceProvider: mockDashboardServiceProvider } = jest.requireMock('./dashboard_service');

describe('RuleDashboards', () => {
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
    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(false),
      }
    };

    render(<RuleDashboards plugins={plugins} />);

    expect(screen.queryByText(/Link dashboard\(s\)/i)).not.toBeInTheDocument();
    expect(mockDashboardServiceProvider).not.toHaveBeenCalled();
    expect(mockDashboardServiceProvider().fetchDashboards).not.toHaveBeenCalled();
    expect(mockDashboardServiceProvider().fetchDashboard).not.toHaveBeenCalled();
  });

  it('renders linked dashboards combo box when feature flag is enabled', async () => {
    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(true),
      }
    };
    
    render(
      <IntlProvider locale="en">
        <RuleDashboards plugins={plugins} />
      </IntlProvider>
    );

    expect(screen.getByText(/Link dashboard\(s\)/i)).toBeInTheDocument();
    expect(useRuleFormState).toHaveBeenCalledTimes(1);
    expect(useRuleFormDispatch).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboards).toHaveBeenCalledTimes(1);
    expect(mockDashboardServiceProvider().fetchDashboard).not.toHaveBeenCalled();
  });

  it('fetches and displays dashboard titles', async () => {
    useRuleFormState.mockReturnValue({
      formData: {
        params: {
          dashboards: [
            {
              id: 1,
            }
          ],
        },
      },
    });

    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(true),
      },
      dashboard: {}
    };
    
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
    useRuleFormState.mockReturnValue({
      formData: {
        params: {
          dashboards: [
            {
              id: '1',
            }
          ],
        },
      },
    });

    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(true),
      },
      dashboard: {},
    };

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
    const inputWrap = screen.getByTestId('ruleLinkedDashboards').querySelector('.euiComboBox__inputWrap');
    if (inputWrap) {
      fireEvent.click(inputWrap);
    }
    fireEvent.click(screen.getByText('Dashboard 2'));

    expect(mockOnChange).toHaveBeenCalledWith({
      type: 'setParamsProperty',
      payload: {
        property: 'dashboards',
        value: [{ id: '1', title: 'Dashboard 1' }, { id: '2', title: 'Dashboard 2' }],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      expect(screen.getByText('Dashboard 2')).toBeInTheDocument();
    });
  });
});
