/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useAlertDeletePreview } from './use_alert_delete_preview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { getAlertDeletePreview } from './get_alert_delete_preview';

const http = httpServiceMock.createStartContract();

jest.mock('./get_alert_delete_preview', () => ({
  getAlertDeletePreview: jest.fn(),
}));

describe('useAlertDeletePreview', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the API with correct parameters', async () => {
    (getAlertDeletePreview as jest.Mock).mockResolvedValueOnce({ affectedAlertCount: 42 });

    const { result } = renderHook(
      () =>
        useAlertDeletePreview({
          services: { http },
          isEnabled: true,
          queryParams: {
            activeAlertDeleteThreshold: 10,
            inactiveAlertDeleteThreshold: 0,
            categoryIds: ['observability'],
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data?.affectedAlertCount).toBeTruthy());

    expect(getAlertDeletePreview).toHaveBeenCalledWith({
      services: { http },
      requestQuery: {
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 0,
        categoryIds: ['observability'],
      },
    });
    expect(result.current.data?.affectedAlertCount).toBe(42);
  });

  it('should not include thresholds when not enabled', () => {
    renderHook(
      () =>
        useAlertDeletePreview({
          services: { http },
          isEnabled: false,
          queryParams: {
            activeAlertDeleteThreshold: 0,
            inactiveAlertDeleteThreshold: 0,
            categoryIds: ['securitySolution'],
          },
        }),
      { wrapper }
    );

    expect(getAlertDeletePreview).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    (getAlertDeletePreview as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(
      () =>
        useAlertDeletePreview({
          services: { http },
          isEnabled: true,
          queryParams: {
            activeAlertDeleteThreshold: 1,
            inactiveAlertDeleteThreshold: 0,
            categoryIds: ['securitySolution'],
          },
        }),
      { wrapper }
    );

    expect(getAlertDeletePreview).toHaveBeenCalled();
    expect(result.current.data?.affectedAlertCount).toBe(undefined);
  });
});
