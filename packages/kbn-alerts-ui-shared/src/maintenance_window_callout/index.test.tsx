/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor, cleanup } from '@testing-library/react';
import {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_FEATURE_ID,
} from '@kbn/alerting-plugin/common';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common';
import type { AsApiContract } from '@kbn/alerting-plugin/server/routes/lib';
import { MaintenanceWindowCallout } from '.';
import { fetchActiveMaintenanceWindows } from './api';

jest.mock('./api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));

const TestProviders: React.FC<{}> = ({ children }) => {
  const queryClient = new QueryClient();
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
};

const RUNNING_MAINTENANCE_WINDOW_1: Partial<MaintenanceWindow> = {
  title: 'Running maintenance window 1',
  id: '63057284-ac31-42ba-fe22-adfe9732e5ae',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:27:30.753Z', lte: '2023-04-20T16:57:30.753Z' }],
};

const RUNNING_MAINTENANCE_WINDOW_2: Partial<MaintenanceWindow> = {
  title: 'Running maintenance window 2',
  id: '45894340-df98-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Running,
  events: [{ gte: '2023-04-20T16:47:42.871Z', lte: '2023-04-20T17:11:32.192Z' }],
};

const RECURRING_RUNNING_MAINTENANCE_WINDOW: Partial<AsApiContract<MaintenanceWindow>> = {
  title: 'Recurring running maintenance window',
  id: 'e2228300-e9ad-11ed-ba37-db17c6e6182b',
  status: MaintenanceWindowStatus.Running,
  events: [
    { gte: '2023-05-03T12:27:18.569Z', lte: '2023-05-03T12:57:18.569Z' },
    { gte: '2023-05-10T12:27:18.569Z', lte: '2023-05-10T12:57:18.569Z' },
  ],
  expiration_date: '2024-05-03T12:27:35.088Z',
  r_rule: {
    dtstart: '2023-05-03T12:27:18.569Z',
    tzid: 'Europe/Amsterdam',
    freq: 3,
    interval: 1,
    count: 2,
    byweekday: ['WE'],
  },
};

const UPCOMING_MAINTENANCE_WINDOW: Partial<MaintenanceWindow> = {
  title: 'Upcoming maintenance window',
  id: '5eafe070-e030-11ed-ac81-bfcb4982b4fd',
  status: MaintenanceWindowStatus.Upcoming,
  events: [
    { gte: '2023-04-21T10:36:14.028Z', lte: '2023-04-21T10:37:00.000Z' },
    { gte: '2023-04-28T10:36:14.028Z', lte: '2023-04-28T10:37:00.000Z' },
  ],
};

const fetchActiveMaintenanceWindowsMock = fetchActiveMaintenanceWindows as jest.Mock;

const kibanaServicesMock = {
  application: {
    capabilities: {
      [MAINTENANCE_WINDOW_FEATURE_ID]: {
        save: true,
        show: true,
      },
    },
  },
  notifications: {
    toasts: {
      addError: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      get$: jest.fn(),
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
    },
  },
  http: {
    fetch: jest.fn(),
  },
};

describe('MaintenanceWindowCallout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('should be visible if currently there is at least one "running" maintenance window', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);

    const { findAllByText } = render(
      <MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />,
      { wrapper: TestProviders }
    );

    expect(await findAllByText('Maintenance window is running')).toHaveLength(1);
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if currently there are multiple "running" maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      RUNNING_MAINTENANCE_WINDOW_1,
      RUNNING_MAINTENANCE_WINDOW_2,
    ]);

    const { findAllByText } = render(
      <MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />,
      { wrapper: TestProviders }
    );

    expect(await findAllByText('Maintenance window is running')).toHaveLength(1);
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if currently there is a recurring "running" maintenance window', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RECURRING_RUNNING_MAINTENANCE_WINDOW]);

    const { findByText } = render(
      <MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />,
      { wrapper: TestProviders }
    );

    // @ts-expect-error Jest types are incomplete in packages
    expect(await findByText('Maintenance window is running')).toBeInTheDocument();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are no active (running or upcoming) maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue(
      [] // API returns an empty array if there are no active maintenance windows
    );

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: TestProviders,
    });
    // @ts-expect-error Jest types are incomplete in packages
    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are only "upcoming" maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([UPCOMING_MAINTENANCE_WINDOW]);

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: TestProviders,
    });
    // @ts-expect-error Jest types are incomplete in packages
    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should see an error toast if there was an error while fetching maintenance windows', async () => {
    const createReactQueryWrapper = () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // Turn retries off, otherwise we won't be able to test errors
            retry: false,
          },
        },
        logger: {
          // Turn network error logging off, so we don't log the failed request to the console
          error: () => {},
          // eslint-disable-next-line no-console
          log: console.log,
          // eslint-disable-next-line no-console
          warn: console.warn,
        },
      });
      const wrapper: React.FC = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      return wrapper;
    };

    const mockError = new Error('Network error');
    fetchActiveMaintenanceWindowsMock.mockRejectedValue(mockError);

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: createReactQueryWrapper(),
    });

    await waitFor(() => {
      expect(kibanaServicesMock.notifications.toasts.addError).toHaveBeenCalledTimes(1);
      expect(kibanaServicesMock.notifications.toasts.addError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to check if maintenance windows are active',
        toastMessage: 'Rule notifications are stopped while the maintenance window is running.',
      });
    });
  });

  it('should return null if window maintenance privilege is NONE', async () => {
    const servicesMock = {
      ...kibanaServicesMock,
      application: {
        capabilities: {
          [MAINTENANCE_WINDOW_FEATURE_ID]: {
            save: false,
            show: false,
          },
        },
      },
    };
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);

    const { container } = render(<MaintenanceWindowCallout kibanaServices={servicesMock} />, {
      wrapper: TestProviders,
    });
    // @ts-expect-error Jest types are incomplete in packages
    expect(container).toBeEmptyDOMElement();
  });

  it('should work as expected if window maintenance privilege is READ ', async () => {
    const servicesMock = {
      ...kibanaServicesMock,
      application: {
        capabilities: {
          [MAINTENANCE_WINDOW_FEATURE_ID]: {
            save: false,
            show: true,
          },
        },
      },
    };
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);

    const { findByText } = render(<MaintenanceWindowCallout kibanaServices={servicesMock} />, {
      wrapper: TestProviders,
    });
    // @ts-expect-error Jest types are incomplete in packages
    expect(await findByText('Maintenance window is running')).toBeInTheDocument();
  });
});
