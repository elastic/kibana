/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';

import { useResolveRule } from './use_resolve_rule';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: Node }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

jest.mock('../apis/resolve_rule/resolve_rule', () => ({
  resolveRule: jest.fn(),
}));

const { resolveRule } = jest.requireMock('../apis/resolve_rule/resolve_rule');

const httpMock = jest.fn();

describe('useResolveRule', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call resolve rule API if ID is passed in', async () => {
    resolveRule.mockResolvedValueOnce({});
    const { result } = renderHook(
      () => {
        return useResolveRule({
          id: 'test-id',
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toBeFalsy();
    });
    expect(result.current.data).not.toBeFalsy();
    expect(resolveRule).toHaveBeenCalled();
  });

  test('should not call resolve rule API if ID is not passed in', async () => {
    resolveRule.mockResolvedValueOnce({});
    const { result } = renderHook(
      () => {
        return useResolveRule({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toBeFalsy();
    });
    expect(result.current.data).toBeFalsy();
    expect(resolveRule).not.toHaveBeenCalled();
  });
});
