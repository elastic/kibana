/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useAccessPolicy } from './hooks';

describe('useAccessPolicy', () => {
  it('returns the policy', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({ enabled: true });

    const { result } = renderHook(() => useAccessPolicy(http, 'action'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ enabled: true });
    expect(http.get).toHaveBeenCalledWith('/internal/security/access_control/action/_policy');
  });

  it('reports a failed request as an error', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockRejectedValue({ message: 'Failed', body: { statusCode: 500, message: 'Boom' } });

    const { result } = renderHook(() => useAccessPolicy(http, 'action'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual({ statusCode: 500, message: 'Boom' });
  });

  it('does not break the host page when a request returns no promise', async () => {
    const http = httpServiceMock.createStartContract();
    // Some host pages are rendered in tests with HTTP mocks that return nothing.
    http.get.mockReturnValue(undefined as never);

    const { result } = renderHook(() => useAccessPolicy(http, 'action'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });
});
