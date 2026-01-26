/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor, cleanup, screen } from '@testing-library/react';
import { MAINTENANCE_WINDOW_FEATURE_ID } from './constants';
import { MaintenanceWindowCallout } from '.';
import { fetchActiveMaintenanceWindows } from './api';
import {
  RECURRING_RUNNING_MAINTENANCE_WINDOW,
  RUNNING_MAINTENANCE_WINDOW_1,
  RUNNING_MAINTENANCE_WINDOW_2,
  UPCOMING_MAINTENANCE_WINDOW,
} from './mock';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

jest.mock('./api', () => ({
  fetchActiveMaintenanceWindows: jest.fn(() => Promise.resolve([])),
}));

const kibanaServicesMock = {
  application: {
    capabilities: {
      [MAINTENANCE_WINDOW_FEATURE_ID]: {
        save: true,
        show: true,
      },
    },
  },
  http: {
    fetch: jest.fn(),
    basePath: {
      prepend: jest.fn((path) => path),
      get: jest.fn(),
      remove: jest.fn(),
      serverBasePath: '',
      assetsHrefBase: '',
    },
  },
};

const notifications = notificationServiceMock.createStartContract();

const { queryClient, provider: TestQueryClientProvider } = createTestResponseOpsQueryClient({
  dependencies: {
    notifications,
  },
});

const wrapper = ({ children }: PropsWithChildren) => {
  return (
    <I18nProvider>
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </I18nProvider>
  );
};

const fetchActiveMaintenanceWindowsMock = fetchActiveMaintenanceWindows as jest.Mock;

describe('MaintenanceWindowCallout', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('should be visible if currently there is at least one "running" maintenance window', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RUNNING_MAINTENANCE_WINDOW_1]);

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    expect(await screen.findAllByText('One or more maintenance windows are running')).toHaveLength(
      1
    );
    expect(await screen.findByTestId('maintenanceWindowPageLink')).toBeInTheDocument();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if currently there are multiple "running" maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([
      RUNNING_MAINTENANCE_WINDOW_1,
      RUNNING_MAINTENANCE_WINDOW_2,
    ]);

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    expect(await screen.findAllByText('One or more maintenance windows are running')).toHaveLength(
      1
    );
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should be visible if currently there is a recurring "running" maintenance window', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([RECURRING_RUNNING_MAINTENANCE_WINDOW]);

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    expect(
      await screen.findByText('One or more maintenance windows are running')
    ).toBeInTheDocument();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are no active (running or upcoming) maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue(
      [] // API returns an empty array if there are no active maintenance windows
    );

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should NOT be visible if currently there are only "upcoming" maintenance windows', async () => {
    fetchActiveMaintenanceWindowsMock.mockResolvedValue([UPCOMING_MAINTENANCE_WINDOW]);

    const { container } = render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    expect(container).toBeEmptyDOMElement();
    expect(fetchActiveMaintenanceWindowsMock).toHaveBeenCalledTimes(1);
  });

  it('should see an error toast if there was an error while fetching maintenance windows', async () => {
    const mockError = new Error('Network error');
    fetchActiveMaintenanceWindowsMock.mockRejectedValue(mockError);

    render(<MaintenanceWindowCallout kibanaServices={kibanaServicesMock} />, {
      wrapper,
    });

    await waitFor(() => {
      expect(notifications.toasts.addError).toHaveBeenCalledTimes(1);
      expect(notifications.toasts.addError).toHaveBeenCalledWith(mockError, {
        title: 'Failed to check if maintenance windows are active',
        toastMessage:
          'Some rule notifications may be stopped while maintenance windows are running.',
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
      wrapper,
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

    render(<MaintenanceWindowCallout kibanaServices={servicesMock} />, {
      wrapper,
    });

    expect(
      await screen.findByText('One or more maintenance windows are running')
    ).toBeInTheDocument();
  });
});
