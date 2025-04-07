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
import { alertDeletePreviewApiCall } from './alert_delete_preview_api_call';

const http = httpServiceMock.createStartContract();

jest.mock('./api_call', () => ({
  alertDeletePreviewApiCall: jest.fn(),
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
    (alertDeletePreviewApiCall as jest.Mock).mockResolvedValueOnce({ affectedAlertCount: 42 });

    const { result } = renderHook(
      () =>
        useAlertDeletePreview({
          services: { http },
          isActiveAlertDeleteEnabled: true,
          isInactiveAlertDeleteEnabled: false,
          activeAlertDeleteThreshold: 10,
          inactiveAlertDeleteThreshold: 0,
          categoryIds: ['category1'],
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.affectedAlertsCount).toBeTruthy());

    expect(alertDeletePreviewApiCall).toHaveBeenCalledWith({
      services: { http },
      requestQuery: {
        isActiveAlertDeleteEnabled: true,
        isInactiveAlertDeleteEnabled: false,
        activeAlertDeleteThreshold: 10,
        inactiveAlertDeleteThreshold: 0,
        categoryIds: ['category1'],
      },
    });
    expect(result.current.affectedAlertsCount).toBe(42);
  });

  it('handles API errors gracefully', async () => {
    (alertDeletePreviewApiCall as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(
      () =>
        useAlertDeletePreview({
          services: { http },
          isActiveAlertDeleteEnabled: true,
          isInactiveAlertDeleteEnabled: false,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 0,
          categoryIds: ['category1'],
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.affectedAlertsCount).toBe(0);
    });

    expect(alertDeletePreviewApiCall).toHaveBeenCalled();
    expect(result.current.affectedAlertsCount).toBe(0);
  });
});
