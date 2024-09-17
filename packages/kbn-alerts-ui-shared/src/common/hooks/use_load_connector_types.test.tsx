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
import { httpServiceMock } from '@kbn/core/public/mocks';

import { useLoadActionTypes } from './use_load_connector_types';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const http = httpServiceMock.createStartContract();

describe('useLoadConnectorTypes', () => {
  beforeEach(() => {
    http.get.mockResolvedValue([
      {
        id: 'test',
        name: 'Test',
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: true,
        supported_feature_ids: ['alerting'],
        minimum_license_required: 'basic',
        is_system_action_type: false,
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call API endpoint with the correct parameters', async () => {
    const { result } = renderHook(
      () =>
        useLoadActionTypes({
          http,
          includeSystemActions: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(result.current.data).toEqual([
      {
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        id: 'test',
        isSystemActionType: false,
        minimumLicenseRequired: 'basic',
        name: 'Test',
        supportedFeatureIds: ['alerting'],
      },
    ]);
  });

  test('should call the correct endpoint if system actions is true', async () => {
    const { result } = renderHook(
      () =>
        useLoadActionTypes({
          http,
          includeSystemActions: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connector_types', {});
  });

  test('should call the correct endpoint if system actions is false', async () => {
    const { result } = renderHook(
      () =>
        useLoadActionTypes({
          http,
          includeSystemActions: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).toHaveBeenCalledWith('/api/actions/connector_types', {});
  });
});
