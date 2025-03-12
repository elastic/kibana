import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleDashboards } from './rule_dashboards';
import { dashboardServiceProvider } from './dashboard_service';

// Mock hooks
jest.mock('../hooks', () => ({
    useRuleFormState: jest.fn(),
    useRuleFormDispatch: jest.fn(),
}));
jest.mock('./dashboard_service');

const mockDashboardServiceProvider = dashboardServiceProvider as jest.Mock;

const { useRuleFormState, useRuleFormDispatch } = jest.requireMock('../hooks');
const mockOnChange = jest.fn();

describe('RuleDashboards', () => {
  const mockFetchDashboard = jest.fn();
  const mockFetchDashboards = jest.fn();

  beforeEach(() => {
      useRuleFormDispatch.mockReturnValue(mockOnChange);
    
      useRuleFormState.mockReturnValue({
        formData: {
          params: {
            dashboards: [],
          },
        },
      });
      mockDashboardServiceProvider.mockReturnValue({
        fetchDashboard: mockFetchDashboard,
        fetchDashboards: mockFetchDashboards,
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders linked dashboards combo box when feature flag is enabled', async () => {
    const plugins = {
      featureFlags: {
        getBooleanValue: jest.fn().mockReturnValue(true),
      },
      dashboard: {
        findDashboardsService: jest.fn().mockResolvedValue({
          search: jest.fn().mockResolvedValue({
            total: 2,
            hits: [
              {
                id: '1',
                attributes: { title: 'Dashboard 1' },
              },
              {
                id: '2',
                attributes: { title: 'Dashboard 2' },
              }
            ],
          }),
        }),
      },
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
      },
      dashboard: {
        findDashboardsService: jest.fn().mockResolvedValue({
          search: jest.fn().mockResolvedValue({
            total: 0,
            hits: []
          })
      }),
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
      dashboard: {
        findDashboardsService: jest.fn().mockResolvedValue({
          search: jest.fn().mockResolvedValue({
            total: 2,
            hits: [
              {
                id: '1',
                attributes: { title: 'Dashboard 1' },
              },
              {
                id: '2',
                attributes: { title: 'Dashboard 2' },
              }
            ],
          }),
        }),
      }
    };

    mockFetchDashboard.mockResolvedValueOnce({
      attributes: { title: 'Dashboard 1' },
    });

    render(
      <IntlProvider locale="en">
        <RuleDashboards plugins={plugins} />
      </IntlProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
    });
  });
});
