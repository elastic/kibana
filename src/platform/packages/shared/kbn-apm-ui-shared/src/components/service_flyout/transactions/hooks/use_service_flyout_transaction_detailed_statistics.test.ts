/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import { LatencyAggregationType } from '@kbn/apm-types';
import { useServiceFlyoutTransactionDetailedStatistics } from './use_service_flyout_transaction_detailed_statistics';
import { usePreferredTransactionDataSource } from './use_preferred_transaction_data_source';

jest.mock('./use_preferred_transaction_data_source', () => ({
  usePreferredTransactionDataSource: jest.fn().mockReturnValue({
    dataSource: { documentType: 'transactionMetric', rollupInterval: '1m' },
    isLoading: false,
  }),
}));

const START = '2024-01-01T00:00:00.000Z';
const END = '2024-01-01T01:00:00.000Z';
const BUCKET_SIZE_IN_SECONDS = Math.ceil(
  (new Date(END).getTime() - new Date(START).getTime()) / 1000 / 20
);

const BASE_PARAMS = {
  serviceName: 'my-service',
  environment: 'production',
  start: START,
  end: END,
  transactionType: 'request',
  latencyAggregationType: LatencyAggregationType.p95,
  transactionNames: ['GET /api/orders', 'POST /api/checkout'],
};

const EMPTY_RESPONSE = { currentPeriod: {}, previousPeriod: {} };

function makeHttp(resolvedValue: object) {
  return {
    get: jest.fn().mockResolvedValue(resolvedValue),
  } as unknown as HttpStart;
}

const mockedUsePreferredTransactionDataSource = usePreferredTransactionDataSource as jest.Mock;

describe('useServiceFlyoutTransactionDetailedStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePreferredTransactionDataSource.mockReturnValue({
      dataSource: { documentType: 'transactionMetric', rollupInterval: '1m' },
      isLoading: false,
    });
  });

  it('calls http.get with the correct endpoint and params', async () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() => useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS }));

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

    expect(http.get).toHaveBeenCalledWith(
      '/internal/apm/services/my-service/transactions/groups/detailed_statistics',
      expect.objectContaining({
        query: expect.objectContaining({
          environment: 'production',
          start: START,
          end: END,
          transactionType: 'request',
          latencyAggregationType: LatencyAggregationType.p95,
          kuery: '',
          documentType: 'transactionMetric',
          rollupInterval: '1m',
          bucketSizeInSeconds: BUCKET_SIZE_IN_SECONDS,
          useDurationSummary: false,
          transactionNames: JSON.stringify(BASE_PARAMS.transactionNames),
        }),
      })
    );
  });

  it('URL-encodes the service name', async () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({
        http,
        ...BASE_PARAMS,
        serviceName: 'my service/v2',
      })
    );

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));
    expect(http.get).toHaveBeenCalledWith(
      '/internal/apm/services/my%20service%2Fv2/transactions/groups/detailed_statistics',
      expect.anything()
    );
  });

  it('does not call http.get when transactionType is undefined', () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({
        http,
        ...BASE_PARAMS,
        transactionType: undefined,
      })
    );

    expect(http.get).not.toHaveBeenCalled();
  });

  it('does not call http.get when latencyAggregationType is undefined', () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({
        http,
        ...BASE_PARAMS,
        latencyAggregationType: undefined,
      })
    );

    expect(http.get).not.toHaveBeenCalled();
  });

  it('does not call http.get when transactionNames is empty', () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({
        http,
        ...BASE_PARAMS,
        transactionNames: [],
      })
    );

    expect(http.get).not.toHaveBeenCalled();
  });

  it('does not call http.get when the data source is not yet available', () => {
    mockedUsePreferredTransactionDataSource.mockReturnValue({
      dataSource: undefined,
      isLoading: true,
    });

    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() => useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS }));

    expect(http.get).not.toHaveBeenCalled();
  });

  it('returns currentPeriod and previousPeriod from the response', async () => {
    const currentPeriod = {
      'GET /api/orders': {
        transactionName: 'GET /api/orders',
        latency: [{ x: 1, y: 200 }],
        throughput: [{ x: 1, y: 5 }],
        errorRate: [{ x: 1, y: 0.01 }],
        impact: 80,
      },
    };
    const previousPeriod = {
      'GET /api/orders': {
        transactionName: 'GET /api/orders',
        latency: [{ x: 1, y: 180 }],
        throughput: [{ x: 1, y: 4 }],
        errorRate: [{ x: 1, y: 0.02 }],
        impact: 75,
      },
    };

    const http = makeHttp({ currentPeriod, previousPeriod });

    const { result } = renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentPeriod).toEqual(currentPeriod);
    expect(result.current.previousPeriod).toEqual(previousPeriod);
  });

  it('returns empty objects before the response arrives', () => {
    const http = makeHttp(EMPTY_RESPONSE);

    const { result } = renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS })
    );

    expect(result.current.currentPeriod).toEqual({});
    expect(result.current.previousPeriod).toEqual({});
  });

  it('forwards offset when provided', async () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({
        http,
        ...BASE_PARAMS,
        offset: '1w',
      })
    );

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

    expect(http.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        query: expect.objectContaining({ offset: '1w' }),
      })
    );
  });

  it('omits offset from the query when not provided', async () => {
    const http = makeHttp(EMPTY_RESPONSE);

    renderHook(() => useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS }));

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

    const query = (http.get as jest.Mock).mock.calls[0][1].query;
    expect(query).not.toHaveProperty('offset');
  });

  it('returns isLoading true while the request is in flight', async () => {
    let resolveRequest!: (value: object) => void;
    const http = {
      get: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
      ),
    } as unknown as HttpStart;

    const { result } = renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    resolveRequest(EMPTY_RESPONSE);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns isLoading true while the data source is loading', () => {
    mockedUsePreferredTransactionDataSource.mockReturnValue({
      dataSource: undefined,
      isLoading: true,
    });

    const http = makeHttp(EMPTY_RESPONSE);

    const { result } = renderHook(() =>
      useServiceFlyoutTransactionDetailedStatistics({ http, ...BASE_PARAMS })
    );

    expect(result.current.isLoading).toBe(true);
  });
});
