/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFetchFlappingSettings } from './use_fetch_flapping_settings';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient();

const http = httpServiceMock.createStartContract();

const now = new Date().toISOString();

describe('useFetchFlappingSettings', () => {
  beforeEach(() => {
    http.get.mockResolvedValue({
      created_by: 'test',
      updated_by: 'test',
      created_at: now,
      updated_at: now,
      enabled: true,
      look_back_window: 20,
      status_change_threshold: 20,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    queryClient.clear();
  });

  test('should call fetchFlappingSettings with the correct parameters', async () => {
    const { result } = renderHook(() => useFetchFlappingSettings({ http, enabled: true }), {
      wrapper,
    });

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.data).toEqual({
      createdAt: now,
      createdBy: 'test',
      updatedAt: now,
      updatedBy: 'test',
      enabled: true,
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    });
  });

  test('should not call fetchFlappingSettings if enabled is false', async () => {
    const { result } = renderHook(() => useFetchFlappingSettings({ http, enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).not.toHaveBeenCalled();
  });
});
