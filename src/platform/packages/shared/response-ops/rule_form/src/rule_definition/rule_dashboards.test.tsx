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
      }
    ])
  }),
}));

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');

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
  });

  it('does not render linked dashboards combo box when feature flag is disabled', () => {
    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(false),
      }
    };

    render(<RuleDashboards plugins={plugins} />);

    expect(screen.queryByText(/Link dashboard\(s\)/i)).not.toBeInTheDocument();
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
