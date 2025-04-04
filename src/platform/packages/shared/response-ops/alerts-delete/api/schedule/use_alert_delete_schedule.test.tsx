/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useAlertDeleteSchedule } from './use_alert_delete_schedule';
import { postAlertDeleteSchedule } from './post_alert_delete_schedule';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { AlertDeleteParams } from '@kbn/alerting-types';

const http = httpServiceMock.createStartContract();

jest.mock('./post_alert_delete_schedule');

describe('useAlertDeleteSchedule', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onSuccess when the mutation succeeds', async () => {
    const mockRequestBody: AlertDeleteParams = {
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    };
    (postAlertDeleteSchedule as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(
      () =>
        useAlertDeleteSchedule({
          services: { http },
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync(mockRequestBody);
    });

    expect(postAlertDeleteSchedule).toHaveBeenCalledWith({
      services: { http },
      requestBody: mockRequestBody,
    });
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should call onError when the mutation fails', async () => {
    const mockRequestBody: AlertDeleteParams = {
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    };
    const mockError: IHttpFetchError<ResponseErrorBody> = {
      body: {
        message: 'Request failed',
        statusCode: 500,
      },
      name: 'Error',
      request: {} as unknown as Request,
      message: 'Internal Server Error',
    };
    (postAlertDeleteSchedule as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(
      () =>
        useAlertDeleteSchedule({
          services: { http },
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper }
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(mockRequestBody);
      } catch (e) {
        // Expected error
      }
    });

    expect(postAlertDeleteSchedule).toHaveBeenCalledWith({
      services: { http },
      requestBody: mockRequestBody,
    });
    expect(mockOnError.mock.calls[0][0]).toEqual(mockError);
    expect(mockOnError.mock.calls[0][1]).toEqual({
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
