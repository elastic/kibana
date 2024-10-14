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
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { useLoadConnectors } from './use_load_connectors';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const http = httpServiceMock.createStartContract();

describe('useLoadConnectors', () => {
  beforeEach(() => {
    http.get.mockResolvedValue([
      {
        id: 'test-connector',
        name: 'Test',
        connector_type_id: 'test',
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        referenced_by_count: 0,
        secrets: {},
        config: {},
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call API endpoint with the correct parameters', async () => {
    const { result } = renderHook(
      () =>
        useLoadConnectors({
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
        actionTypeId: 'test',
        config: {},
        id: 'test-connector',
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'Test',
        referencedByCount: 0,
        secrets: {},
      },
    ]);
  });

  test('should call the correct endpoint if system actions is true', async () => {
    const { result } = renderHook(
      () =>
        useLoadConnectors({
          http,
          includeSystemActions: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).toHaveBeenCalledWith('/internal/actions/connectors');
  });

  test('should call the correct endpoint if system actions is false', async () => {
    const { result } = renderHook(
      () =>
        useLoadConnectors({
          http,
          includeSystemActions: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toEqual(false);
    });

    expect(http.get).toHaveBeenCalledWith('/api/actions/connectors');
  });
});
