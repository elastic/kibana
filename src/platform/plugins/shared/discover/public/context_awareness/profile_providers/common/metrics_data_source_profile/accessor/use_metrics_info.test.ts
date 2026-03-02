/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { useMetricsInfo } from './use_metrics_info';
import { fetchMetricsInfo } from '../utils/fetch_metrics_info';

jest.mock('../utils/fetch_metrics_info', () => ({
  fetchMetricsInfo: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchMetricsInfo = fetchMetricsInfo as jest.MockedFunction<typeof fetchMetricsInfo>;

const createServices = (): UnifiedHistogramServices =>
  ({
    data: { search: { search: jest.fn() } },
    uiSettings: {},
  } as unknown as UnifiedHistogramServices);

const createFetchParams = (
  overrides: Partial<UnifiedHistogramFetchParams> = {}
): UnifiedHistogramFetchParams =>
  ({
    dataView: dataViewWithTimefieldMock,
    isESQLQuery: true,
    query: { esql: 'TS metrics-* | WHERE x > 0' },
    timeRange: { from: 'now-15m', to: 'now' },
    filters: [],
    abortController: new AbortController(),
    ...overrides,
  } as unknown as UnifiedHistogramFetchParams);

describe('useMetricsInfo', () => {
  beforeEach(() => {
    mockFetchMetricsInfo.mockClear();
  });

  it('calls fetchMetricsInfo when visible, ESQL query, and non-transformational', async () => {
    const fetchParams = createFetchParams({
      query: { esql: 'TS metrics-* | WHERE x > 0' },
      isESQLQuery: true,
    });
    const services = createServices();

    renderHook(() => useMetricsInfo(fetchParams, services, true));

    await waitFor(() => {
      expect(mockFetchMetricsInfo).toHaveBeenCalledTimes(1);
    });
    expect(mockFetchMetricsInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        dataView: dataViewWithTimefieldMock,
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [],
        esqlQuery: 'TS metrics-* | WHERE x > 0 | METRICS_INFO',
        search: services.data.search.search,
        uiSettings: services.uiSettings,
      })
    );
  });

  it('does not call fetchMetricsInfo when isComponentVisible is false', async () => {
    const fetchParams = createFetchParams();
    const services = createServices();

    renderHook(() => useMetricsInfo(fetchParams, services, false));

    await waitFor(() => {}, { timeout: 100 }).catch(() => {});
    expect(mockFetchMetricsInfo).not.toHaveBeenCalled();
  });

  it('does not call fetchMetricsInfo when query is not ESQL', async () => {
    const fetchParams = createFetchParams({
      query: { query: 'foo', language: 'kuery' },
      isESQLQuery: false,
    });
    const services = createServices();

    renderHook(() => useMetricsInfo(fetchParams, services, true));

    await waitFor(() => {}, { timeout: 100 }).catch(() => {});
    expect(mockFetchMetricsInfo).not.toHaveBeenCalled();
  });

  it('does not call fetchMetricsInfo when query has transformational command', async () => {
    const fetchParams = createFetchParams({
      query: { esql: 'TS metrics-* | STATS count() BY host' },
      isESQLQuery: true,
    });
    const services = createServices();

    renderHook(() => useMetricsInfo(fetchParams, services, true));

    await waitFor(() => {}, { timeout: 100 }).catch(() => {});
    expect(mockFetchMetricsInfo).not.toHaveBeenCalled();
  });

  it('does not call fetchMetricsInfo when dataView is missing', async () => {
    const fetchParams = createFetchParams({
      dataView: undefined as unknown as UnifiedHistogramFetchParams['dataView'],
    });
    const services = createServices();

    renderHook(() => useMetricsInfo(fetchParams, services, true));

    await waitFor(() => {}, { timeout: 100 }).catch(() => {});
    expect(mockFetchMetricsInfo).not.toHaveBeenCalled();
  });
});
