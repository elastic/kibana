/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeFilter } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { buildEsQuery } from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/public';
import { ESQLVariableType } from '@kbn/esql-types';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { fetchMetricsInfo } from './fetch_metrics_info';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: jest.fn(() => ({ query: { bool: {} } })),
}));

jest.mock('@kbn/data-plugin/public', () => ({
  getTime: jest.fn(),
  getEsQueryConfig: jest.fn(() => ({ allowLeadingWildcards: true, queryStringOptions: {} })),
}));

const mockGetESQLResults = getESQLResults as jest.MockedFunction<typeof getESQLResults>;
const mockBuildEsQuery = buildEsQuery as jest.MockedFunction<typeof buildEsQuery>;
const mockGetTime = getTime as jest.MockedFunction<typeof getTime>;

describe('fetchMetricsInfo', () => {
  const mockSearch = jest.fn();
  const mockUiSettings = {} as Parameters<typeof fetchMetricsInfo>[0]['uiSettings'];
  const mockResponse = { columns: [], values: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue({
      response: mockResponse,
      params: { query: '' },
    } as unknown as Awaited<ReturnType<typeof getESQLResults>>);
    mockGetTime.mockReturnValue(undefined);
  });

  it('calls getESQLResults with the given esqlQuery, search, signal, dataView, timeRange, and variables', async () => {
    const signal = new AbortController().signal;
    const timeRange = { from: 'now-15m', to: 'now' };
    const variables = [{ key: 'x', value: 'y', type: ESQLVariableType.VALUES }];

    await fetchMetricsInfo({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      signal,
      dataView: dataViewWithTimefieldMock,
      timeRange,
      filters: [],
      variables,
      uiSettings: mockUiSettings,
    });

    expect(mockGetESQLResults).toHaveBeenCalledTimes(1);
    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        search: mockSearch,
        signal,
        timeRange,
        variables,
      })
    );
  });

  it('returns the response from getESQLResults', async () => {
    const result = await fetchMetricsInfo({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithTimefieldMock,
      uiSettings: mockUiSettings,
    });

    expect(result).toBe(mockResponse);
  });

  it('builds filter from time and filters when timeRange and dataView have timeFieldName', async () => {
    const timeFilter = {
      meta: { index: 'test', type: 'range' as const },
      query: { range: {} },
    } as RangeFilter;
    mockGetTime.mockReturnValue(timeFilter);

    await fetchMetricsInfo({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithTimefieldMock,
      timeRange: { from: 'now-1h', to: 'now' },
      filters: [],
      uiSettings: mockUiSettings,
    });

    expect(mockGetTime).toHaveBeenCalledWith(
      dataViewWithTimefieldMock,
      { from: 'now-1h', to: 'now' },
      { fieldName: dataViewWithTimefieldMock.timeFieldName }
    );
    expect(mockBuildEsQuery).toHaveBeenCalled();
    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { query: { bool: {} } },
      })
    );
  });

  it('passes no filter when no time range and no filters', async () => {
    mockGetTime.mockReturnValue(undefined);

    await fetchMetricsInfo({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithTimefieldMock,
      filters: [],
      uiSettings: mockUiSettings,
    });

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: undefined,
      })
    );
  });

  describe('when fetch fails (EBT discover_metrics_info_fetch_failed)', () => {
    it('invokes onFetchFailed with payload and rethrows', async () => {
      const error = new Error('search failed');
      mockGetESQLResults.mockRejectedValue(error);

      const onFetchFailed = jest.fn();

      await expect(
        fetchMetricsInfo({
          esqlQuery: 'TS metrics-* | METRICS_INFO',
          search: mockSearch,
          dataView: dataViewWithTimefieldMock,
          uiSettings: mockUiSettings,
          onFetchFailed,
        })
      ).rejects.toThrow('search failed');

      expect(onFetchFailed).toHaveBeenCalledTimes(1);
      expect(onFetchFailed).toHaveBeenCalledWith({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        dataViewId: dataViewWithTimefieldMock.id,
        errorMessage: 'search failed',
      });
    });

    it('invokes onFetchFailed with stringified errorMessage when rejection is not an Error instance', async () => {
      mockGetESQLResults.mockRejectedValue('string error');

      const onFetchFailed = jest.fn();

      await expect(
        fetchMetricsInfo({
          esqlQuery: 'TS metrics-* | METRICS_INFO',
          search: mockSearch,
          dataView: dataViewWithTimefieldMock,
          uiSettings: mockUiSettings,
          onFetchFailed,
        })
      ).rejects.toBe('string error');

      expect(onFetchFailed).toHaveBeenCalledTimes(1);
      expect(onFetchFailed).toHaveBeenCalledWith({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        dataViewId: dataViewWithTimefieldMock.id,
        errorMessage: 'string error',
      });
    });

    it('does not call onFetchFailed when it is not provided and still rejects', async () => {
      mockGetESQLResults.mockRejectedValue(new Error('fail'));

      await expect(
        fetchMetricsInfo({
          esqlQuery: 'TS metrics-* | METRICS_INFO',
          search: mockSearch,
          dataView: dataViewWithTimefieldMock,
          uiSettings: mockUiSettings,
        })
      ).rejects.toThrow('fail');
    });
  });
});
