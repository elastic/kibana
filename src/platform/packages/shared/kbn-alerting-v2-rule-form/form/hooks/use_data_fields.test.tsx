/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { getFields } from '../../flyout/utils';
import { useDataFields } from './use_data_fields';

jest.mock('@kbn/esql-utils');
jest.mock('../../flyout/utils');

const mockGetESQLAdHocDataview = jest.mocked(getESQLAdHocDataview);
const mockGetFields = jest.mocked(getFields);

const createMockHttp = () => ({} as any);
const createMockDataViews = () => ({} as any);

describe('useDataFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty fields when query is empty', async () => {
    const http = createMockHttp();
    const dataViews = createMockDataViews();
    const { result } = renderHook(() =>
      useDataFields({
        query: '',
        http,
        dataViews,
      })
    );

    expect(result.current.fields).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
  });

  it('fetches fields when query is provided', async () => {
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
    };
    const mockFields = [
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'text' },
    ];

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);
    mockGetFields.mockResolvedValue(mockFields);

    const http = createMockHttp();
    const dataViews = createMockDataViews();

    const { result } = renderHook(() =>
      useDataFields({
        query: 'FROM logs-* | LIMIT 10',
        http,
        dataViews,
      })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fields).toEqual(mockFields);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLAdHocDataview).toHaveBeenCalled();
    expect(mockGetFields).toHaveBeenCalledWith(expect.anything(), ['logs-*']);
  });

  it('returns empty fields when dataView is null', async () => {
    mockGetESQLAdHocDataview.mockResolvedValue(null as any);

    const http = createMockHttp();
    const dataViews = createMockDataViews();

    const { result } = renderHook(() =>
      useDataFields({
        query: 'FROM logs-* | LIMIT 10',
        http,
        dataViews,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fields).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    const testError = new Error('Failed to fetch data view');
    mockGetESQLAdHocDataview.mockRejectedValue(testError);

    const http = createMockHttp();
    const dataViews = createMockDataViews();

    const { result } = renderHook(() =>
      useDataFields({
        query: 'FROM logs-* | LIMIT 10',
        http,
        dataViews,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fields).toEqual([]);
    expect(result.current.error).toBe(testError);
  });

  it('refetches when query changes', async () => {
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
    };
    const mockFields = [{ name: '@timestamp', type: 'date' }];

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);
    mockGetFields.mockResolvedValue(mockFields);

    const http = createMockHttp();
    const dataViews = createMockDataViews();

    const { result, rerender } = renderHook(
      ({ query }) =>
        useDataFields({
          query,
          http,
          dataViews,
        }),
      { initialProps: { query: 'FROM logs-* | LIMIT 10' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(1);

    // Change query
    rerender({ query: 'FROM metrics-* | LIMIT 10' });

    await waitFor(() => {
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(2);
    });
  });
});
