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
import { render, waitFor, cleanup, screen } from '@testing-library/react';
import { MAINTENANCE_WINDOW_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { MaintenanceWindowCallout } from '.';
import { fetchActiveMaintenanceWindows } from './api';
import {
  RECURRING_RUNNING_MAINTENANCE_WINDOW,
  RUNNING_MAINTENANCE_WINDOW_1,
  RUNNING_MAINTENANCE_WINDOW_2,
  UPCOMING_MAINTENANCE_WINDOW,
} from './mock';

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

    expect(await findAllByText('One or more maintenance windows are running')).toHaveLength(1);
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

    expect(await findAllByText('One or more maintenance windows are running')).toHaveLength(1);
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if currently there is a recurring "running" maintenance window', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RECURRING_RUNNING_MAINTENANCE_WINDOW]);

    const { findByText } = render(
      <MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />,
      { wrapper: TestProviders }
    );

    expect(await findByText('One or more maintenance windows are running')).toBeInTheDocument();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are no active (running or upcoming) maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue(
      [] // API returns an empty array if there are no active maintenance windows
    );

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are only "upcoming" maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([UPCOMING_MAINTENANCE_WINDOW]);

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if there is a "running" maintenance window that matches the specified category', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability'],
      },
    ]);

    const { findByText } = render(
      <MaintenanceWindowCallout
        kibanaServices={kibanaServicesMock}
        categories={['observability']}
      />,
      { wrapper: TestProviders }
    );

    expect(
      await findByText('A maintenance window is running for Observability rules')
    ).toBeInTheDocument();
  });

  it('should NOT be visible if there is a "running" maintenance window that does not match the specified category', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability'],
      },
    ]);

    const { container } = render(
      <MaintenanceWindowCallout
        kibanaServices={kibanaServicesMock}
        categories={['securitySolution']}
      />,
      { wrapper: TestProviders }
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should be visible if there is a "running" maintenance window with a category, and no categories are specified', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability'],
      },
    ]);

    const { findByText } = render(
      <MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />,
      { wrapper: TestProviders }
    );

    expect(
      await findByText('A maintenance window is running for Observability rules')
    ).toBeInTheDocument();
  });

  it('should only display the specified categories in the callout title for a maintenance window that matches muliple categories', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability', 'securitySolution', 'management'],
      },
    ]);

    const { findByText } = render(
      <MaintenanceWindowCallout
        kibanaServices={kibanaServicesMock}
        categories={['observability', 'management']}
      />,
      { wrapper: TestProviders }
    );

    expect(
      await findByText('A maintenance window is running for Observability and Stack rules')
    ).toBeInTheDocument();
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
        toastMessage: 'Rule notifications are stopped while maintenance windows are running.',
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

    expect(container).toBeEmptyDOMElement();
  });

  it('should work as expected if window maintenance privilege is READ', async () => {
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

    expect(await findByText('One or more maintenance windows are running')).toBeInTheDocument();
  });

  it('should display the callout if the category ids contains the specified category', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['observability'],
      },
    ]);

    render(
      <MaintenanceWindowCallout
        kibanaServices={kibanaServicesMock}
        categories={['securitySolution']}
      />,
      {
        wrapper: TestProviders,
      }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('maintenanceWindowCallout')).not.toBeInTheDocument();
    });

    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      {
        ...RUNNING_MAINTENANCE_WINDOW_1,
        categoryIds: ['securitySolution'],
      },
    ]);

    render(
      <MaintenanceWindowCallout
        kibanaServices={kibanaServicesMock}
        categories={['securitySolution']}
      />,
      {
        wrapper: TestProviders,
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('maintenanceWindowCallout')).toBeInTheDocument();
    });

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(screen.getByTestId('maintenanceWindowCallout')).toBeInTheDocument();
    });
  });
});
