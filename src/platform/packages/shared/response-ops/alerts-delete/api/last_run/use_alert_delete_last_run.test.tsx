/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAlertDeleteLastRun } from './use_alert_delete_last_run';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { getAlertDeleteLastRun } from './get_alert_delete_last_run';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const http = httpServiceMock.createStartContract();

jest.mock('./get_alert_delete_last_run', () => ({
  getAlertDeleteLastRun: jest.fn(),
}));

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useAlertDeleteLastRun', () => {
  const testDate = '2025-10-01T00:00:00Z';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the API with correct parameters', async () => {
    (getAlertDeleteLastRun as jest.Mock).mockResolvedValueOnce({ lastRun: testDate });

    const { result } = renderHook(
      () =>
        useAlertDeleteLastRun({
          services: { http },
          isOpen: true,
          isEnabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data?.lastRun).not.toBe(undefined);
    });

    expect(getAlertDeleteLastRun).toHaveBeenCalledWith({
      services: { http },
    });
    expect(result.current.data?.lastRun).toBe(testDate);
  });

  it('handles API errors gracefully', async () => {
    (getAlertDeleteLastRun as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(
      () =>
        useAlertDeleteLastRun({
          services: { http },
          isEnabled: true,
          isOpen: true,
        }),
      { wrapper }
    );

    expect(getAlertDeleteLastRun).toHaveBeenCalled();
    expect(result.current.data?.lastRun).toBe(undefined);
  });

  it('does not call the API when isOpen is false', async () => {
    renderHook(
      () =>
        useAlertDeleteLastRun({
          services: { http },
          isEnabled: true,
          isOpen: false,
        }),
      { wrapper }
    );

    expect(getAlertDeleteLastRun).not.toHaveBeenCalled();
  });

  it('does not call the API again if modal is already open (wasModalClosed is false)', () => {
    (getAlertDeleteLastRun as jest.Mock).mockResolvedValueOnce({ lastRun: testDate });

    const { rerender } = renderHook(
      () =>
        useAlertDeleteLastRun({
          services: { http },
          isEnabled: true,
          isOpen: true,
        }),
      { wrapper }
    );

    expect(getAlertDeleteLastRun).toHaveBeenCalledTimes(1);

    rerender();

    expect(getAlertDeleteLastRun).toHaveBeenCalledTimes(1);
  });
});
