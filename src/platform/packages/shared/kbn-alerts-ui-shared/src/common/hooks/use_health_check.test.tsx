/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';

import { useHealthCheck } from './use_health_check';
import { healthCheckErrors } from '../apis';

jest.mock('../apis/fetch_ui_health_status/fetch_ui_health_status', () => ({
  fetchUiHealthStatus: jest.fn(),
}));

jest.mock('../apis/fetch_alerting_framework_health/fetch_alerting_framework_health', () => ({
  fetchAlertingFrameworkHealth: jest.fn(),
}));

const { fetchUiHealthStatus } = jest.requireMock(
  '../apis/fetch_ui_health_status/fetch_ui_health_status'
);
const { fetchAlertingFrameworkHealth } = jest.requireMock(
  '../apis/fetch_alerting_framework_health/fetch_alerting_framework_health'
);

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const httpMock = jest.fn();

describe('useHealthCheck', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null if there are no errors', async () => {
    fetchUiHealthStatus.mockResolvedValueOnce({
      isRulesAvailable: true,
    });

    fetchAlertingFrameworkHealth.mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });

    const { result } = renderHook(
      () => {
        return useHealthCheck({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current.error).toBeNull();
  });

  test('should return alerts error if rules are not available', async () => {
    fetchUiHealthStatus.mockResolvedValueOnce({
      isRulesAvailable: false,
    });

    fetchAlertingFrameworkHealth.mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });

    const { result } = renderHook(
      () => {
        return useHealthCheck({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current.error).toEqual(healthCheckErrors.ALERTS_ERROR);
  });

  test('should return API keys encryption error if not secure or has no encryption key', async () => {
    fetchUiHealthStatus.mockResolvedValueOnce({
      isRulesAvailable: true,
    });

    fetchAlertingFrameworkHealth.mockResolvedValueOnce({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: false,
    });

    const { result } = renderHook(
      () => {
        return useHealthCheck({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current.error).toEqual(healthCheckErrors.API_KEYS_AND_ENCRYPTION_ERROR);
  });

  test('should return encryption error if has no encryption key', async () => {
    fetchUiHealthStatus.mockResolvedValueOnce({
      isRulesAvailable: true,
    });

    fetchAlertingFrameworkHealth.mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });

    const { result } = renderHook(
      () => {
        return useHealthCheck({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current.error).toEqual(healthCheckErrors.ENCRYPTION_ERROR);
  });

  test('should return API keys disabled error is API keys are disabled', async () => {
    fetchUiHealthStatus.mockResolvedValueOnce({
      isRulesAvailable: true,
    });

    fetchAlertingFrameworkHealth.mockResolvedValueOnce({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
    });

    const { result } = renderHook(
      () => {
        return useHealthCheck({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isLoading).toEqual(false);
    });

    expect(result.current.error).toEqual(healthCheckErrors.API_KEYS_DISABLED_ERROR);
  });
});
