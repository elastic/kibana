/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor, renderHook } from '@testing-library/react';
import { MaintenanceWindowStatus } from '@kbn/alerting-plugin/common';
import * as api from '../apis/bulk_get_maintenance_windows';
import { coreMock } from '@kbn/core/public/mocks';
import { useBulkGetMaintenanceWindowsQuery } from './use_bulk_get_maintenance_windows';
import { useLicense } from './use_license';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { testQueryClientConfig } from '../utils/test';

jest.mock('./use_license');
jest.mock('../apis/bulk_get_maintenance_windows');

const useLicenseMock = useLicense as jest.Mock;

const { http, notifications, application } = coreMock.createStart();
const licensing = licensingMock.createStart();

const mockMaintenanceWindow = {
  id: 'test-id',
  title: 'test-title',
  duration: 60 * 60 * 1000,
  enabled: true,
  rRule: {
    tzid: 'UTC',
    dtstart: '2023-02-26T00:00:00.000Z',
    freq: 2 as const,
    count: 2,
  },
  status: MaintenanceWindowStatus.Running,
  eventStartTime: '2023-03-05T00:00:00.000Z',
  eventEndTime: '2023-03-05T01:00:00.000Z',
  events: [
    {
      gte: '2023-02-26T00:00:00.000Z',
      lte: '2023-02-26T01:00:00.000Z',
    },
    {
      gte: '2023-03-05T00:00:00.000Z',
      lte: '2023-03-05T01:00:00.000Z',
    },
  ],
  createdAt: '2023-02-26T00:00:00.000Z',
  updatedAt: '2023-02-26T00:00:00.000Z',
  createdBy: 'test-user',
  updatedBy: 'test-user',
  expirationDate: '2024-02-26T00:00:00.000Z',
};

const response = {
  maintenanceWindows: [mockMaintenanceWindow],
  errors: [],
};

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useBulkGetMaintenanceWindowsQuery', () => {
  let addErrorMock: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    addErrorMock = notifications.toasts.addError as jest.Mock;
    application.capabilities = {
      ...application.capabilities,
      maintenanceWindow: {
        show: true,
      },
    };
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    const { result } = renderHook(
      () =>
        useBulkGetMaintenanceWindowsQuery({
          ids: ['test-id'],
          http,
          notifications,
          application,
          licensing,
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.data?.get('test-id')).toEqual(mockMaintenanceWindow));

    expect(spy).toHaveBeenCalledWith({
      http: expect.anything(),
      ids: ['test-id'],
    });
  });

  it('does not call the api if the canFetchMaintenanceWindows is false', async () => {
    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindowsQuery(
          {
            ids: ['test-id'],
            http,
            notifications,
            application,
            licensing,
          },
          {
            enabled: false,
          }
        ),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('does not call the api if license is not platinum', async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });

    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindowsQuery({
          ids: ['test-id'],
          http,
          notifications,
          application,
          licensing,
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('does not call the api if capabilities are not adequate', async () => {
    application.capabilities = {
      ...application.capabilities,
      maintenanceWindow: {
        show: false,
      },
    };

    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindowsQuery({
          ids: ['test-id'],
          http,
          notifications,
          application,
          licensing,
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    const spy = jest
      .spyOn(api, 'bulkGetMaintenanceWindows')
      .mockRejectedValue(new Error('An error'));

    renderHook(
      () =>
        useBulkGetMaintenanceWindowsQuery({
          ids: ['test-id'],
          http,
          notifications,
          application,
          licensing,
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        http: expect.anything(),
        ids: ['test-id'],
      });
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
