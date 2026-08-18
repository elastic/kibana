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
import { useServiceFlyoutTransactionData } from './use_service_flyout_transaction_data';
import { usePreferredTransactionDataSource } from './use_preferred_transaction_data_source';

jest.mock('./use_preferred_transaction_data_source', () => ({
  usePreferredTransactionDataSource: jest.fn().mockReturnValue({
    dataSource: { documentType: 'transactionMetric', rollupInterval: '1m' },
    isLoading: false,
    error: undefined,
  }),
  parseIntervalSeconds: jest.requireActual('./use_preferred_transaction_data_source')
    .parseIntervalSeconds,
}));

const START = '2024-01-01T00:00:00.000Z';
const END = '2024-01-01T01:00:00.000Z';
const BUCKET_SIZE_IN_SECONDS = Math.ceil(
  (new Date(END).getTime() - new Date(START).getTime()) / 1000 / 20
);

const mockAddDanger = jest.fn();

const BASE_PARAMS = {
  notifications: { toasts: { addDanger: mockAddDanger } } as any,
  serviceName: 'my-service',
  environment: 'production',
  start: START,
  end: END,
  transactionType: 'request',
  latencyAggregationType: LatencyAggregationType.p95,
  searchQuery: '',
};

const EMPTY_MAIN_RESPONSE = {
  transactionGroups: [],
  maxCountExceeded: false,
  hasActiveAlerts: false,
};
const EMPTY_DETAILED_RESPONSE = { currentPeriod: {}, previousPeriod: {} };

const TRANSACTION_GROUPS = [
  {
    name: 'GET /api/orders',
    transactionType: 'request',
    latency: 1200000,
    throughput: 42.3,
    errorRate: 0.02,
    alertsCount: 1,
    impact: 90,
  },
  {
    name: 'POST /api/checkout',
    transactionType: 'request',
    latency: 340000,
    throughput: 18.1,
    errorRate: 0.05,
    alertsCount: 0,
  },
];

const mockedUsePreferredTransactionDataSource = usePreferredTransactionDataSource as jest.Mock;

function makeHttp(mainResponse: object, detailedResponse?: object) {
  return {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('detailed_statistics')) {
        return Promise.resolve(detailedResponse ?? EMPTY_DETAILED_RESPONSE);
      }
      return Promise.resolve(mainResponse);
    }),
  } as unknown as HttpStart;
}

describe('useServiceFlyoutTransactionData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePreferredTransactionDataSource.mockReturnValue({
      dataSource: { documentType: 'transactionMetric', rollupInterval: '1m' },
      isLoading: false,
      error: undefined,
    });
  });

  describe('main statistics', () => {
    it('calls the main_statistics endpoint with correct params', async () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          '/internal/apm/services/my-service/transactions/groups/main_statistics',
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
              searchQuery: '',
            }),
          })
        )
      );
    });

    it('URL-encodes the service name', async () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, serviceName: 'my service/v2' })
      );

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          '/internal/apm/services/my%20service%2Fv2/transactions/groups/main_statistics',
          expect.anything()
        )
      );
    });

    it('does not fetch when transactionType is undefined', () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, transactionType: undefined })
      );

      expect(http.get).not.toHaveBeenCalled();
    });

    it('does not fetch when latencyAggregationType is undefined', () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      renderHook(() =>
        useServiceFlyoutTransactionData({
          http,
          ...BASE_PARAMS,
          latencyAggregationType: undefined,
        })
      );

      expect(http.get).not.toHaveBeenCalled();
    });

    it('maps response transactionGroups to TransactionGroup items', async () => {
      const http = makeHttp({ ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS });

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.items).toHaveLength(2));
      expect(result.current.items[0]).toMatchObject({
        name: 'GET /api/orders',
        latency: { value: 1200000 },
        throughput: { value: 42.3 },
        errorRate: { value: 0.02 },
        alertsCount: 1,
        impact: { value: 90 },
      });
    });

    it('maps null latency and errorRate to null', async () => {
      const http = makeHttp({
        ...EMPTY_MAIN_RESPONSE,
        transactionGroups: [
          { name: 'GET /api', latency: null, throughput: 0, errorRate: null, alertsCount: 0 },
        ],
      });

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(result.current.items[0].latency.value).toBeNull();
      expect(result.current.items[0].errorRate.value).toBeNull();
    });

    it('omits impact when absent from the response', async () => {
      const http = makeHttp({
        ...EMPTY_MAIN_RESPONSE,
        transactionGroups: [
          { name: 'GET /api', latency: 100, throughput: 1, errorRate: 0, alertsCount: 0 },
        ],
      });

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.items).toHaveLength(1));
      expect(result.current.items[0].impact).toBeUndefined();
    });

    it('reflects hasActiveAlerts from the response', async () => {
      const http = makeHttp({ ...EMPTY_MAIN_RESPONSE, hasActiveAlerts: true });

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.hasActiveAlerts).toBe(true));
    });

    it('re-fetches when refreshToken changes', async () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      const mainCalls = () =>
        (http.get as jest.Mock).mock.calls.filter((c) => c[0].includes('main_statistics'));

      const { rerender } = renderHook(
        ({ refreshToken }: { refreshToken: number }) =>
          useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, refreshToken }),
        { initialProps: { refreshToken: 0 } }
      );

      await waitFor(() => expect(mainCalls()).toHaveLength(1));

      rerender({ refreshToken: 1 });

      await waitFor(() => expect(mainCalls()).toHaveLength(2));
    });

    it('filters items in-memory when maxCountExceeded is false', async () => {
      const http = makeHttp({ ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS });

      const { result, rerender } = renderHook(
        ({ searchQuery }: { searchQuery: string }) =>
          useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, searchQuery }),
        { initialProps: { searchQuery: '' } }
      );

      await waitFor(() => expect(result.current.items).toHaveLength(2));

      const mainCallsBefore = (http.get as jest.Mock).mock.calls.filter((c) =>
        c[0].includes('main_statistics')
      ).length;

      rerender({ searchQuery: 'checkout' });

      const mainCallsAfter = (http.get as jest.Mock).mock.calls.filter((c) =>
        c[0].includes('main_statistics')
      ).length;

      expect(mainCallsAfter).toBe(mainCallsBefore);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('POST /api/checkout');
    });

    it('re-fetches server-side when searchQuery changes and maxCountExceeded is true', async () => {
      const http = makeHttp({
        transactionGroups: [],
        maxCountExceeded: true,
        hasActiveAlerts: false,
      });

      const { rerender } = renderHook(
        ({ searchQuery }: { searchQuery: string }) =>
          useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, searchQuery }),
        { initialProps: { searchQuery: '' } }
      );

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1));

      rerender({ searchQuery: 'checkout' });

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    });

    it('resets maxCountExceeded when serviceName changes', async () => {
      const http = {
        get: jest
          .fn()
          .mockResolvedValueOnce({
            transactionGroups: [],
            maxCountExceeded: true,
            hasActiveAlerts: false,
          })
          .mockResolvedValue({
            transactionGroups: [],
            maxCountExceeded: false,
            hasActiveAlerts: false,
          }),
      } as unknown as HttpStart;

      const { result, rerender } = renderHook(
        ({ serviceName }: { serviceName: string }) =>
          useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, serviceName }),
        { initialProps: { serviceName: 'my-service' } }
      );

      await waitFor(() => expect(result.current.maxCountExceeded).toBe(true));

      rerender({ serviceName: 'other-service' });

      await waitFor(() => expect(result.current.maxCountExceeded).toBe(false));
    });
  });

  describe('detailed statistics', () => {
    it('calls the detailed_statistics endpoint after main stats resolve', async () => {
      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        EMPTY_DETAILED_RESPONSE
      );

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
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
              transactionNames: JSON.stringify(['GET /api/orders', 'POST /api/checkout']),
            }),
          })
        )
      );
    });

    it('does not call detailed_statistics when main stats returns no items', async () => {
      const http = makeHttp(EMPTY_MAIN_RESPONSE);

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          expect.stringContaining('main_statistics'),
          expect.anything()
        )
      );

      expect(http.get).not.toHaveBeenCalledWith(
        expect.stringContaining('detailed_statistics'),
        expect.anything()
      );
    });

    it('forwards offset when provided', async () => {
      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        EMPTY_DETAILED_RESPONSE
      );

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS, offset: '1w' }));

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          expect.stringContaining('detailed_statistics'),
          expect.objectContaining({ query: expect.objectContaining({ offset: '1w' }) })
        )
      );
    });

    it('omits offset from the query when not provided', async () => {
      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        EMPTY_DETAILED_RESPONSE
      );

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          expect.stringContaining('detailed_statistics'),
          expect.anything()
        )
      );

      const detailedCall = (http.get as jest.Mock).mock.calls.find((c) =>
        c[0].includes('detailed_statistics')
      );
      expect(detailedCall[1].query).not.toHaveProperty('offset');
    });

    it('clamps bucketSizeInSeconds to the rollup interval when rollup is coarser', async () => {
      mockedUsePreferredTransactionDataSource.mockReturnValue({
        dataSource: { documentType: 'transactionMetric', rollupInterval: '1h' },
        isLoading: false,
        error: undefined,
      });

      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        EMPTY_DETAILED_RESPONSE
      );

      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(
          expect.stringContaining('detailed_statistics'),
          expect.objectContaining({
            query: expect.objectContaining({ bucketSizeInSeconds: 3600 }),
          })
        )
      );
    });
  });

  describe('sparkline merge', () => {
    it('returns items with series attached when detailed stats have data', async () => {
      const detailedResponse = {
        currentPeriod: {
          'GET /api/orders': {
            transactionName: 'GET /api/orders',
            latency: [{ x: 1, y: 200 }],
            throughput: [{ x: 1, y: 5 }],
            errorRate: [{ x: 1, y: 0.01 }],
            impact: 80,
          },
        },
        previousPeriod: {},
      };

      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        detailedResponse
      );

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => {
        const item = result.current.items.find((i) => i.name === 'GET /api/orders');
        expect(item?.latency.series).toBeDefined();
      });

      const enriched = result.current.items.find((i) => i.name === 'GET /api/orders');
      expect(enriched?.latency.series).toEqual({ value: [{ x: 1, y: 200 }] });
      expect(enriched?.throughput.series).toEqual({ value: [{ x: 1, y: 5 }] });
      expect(enriched?.errorRate.series).toEqual({ value: [{ x: 1, y: 0.01 }] });
    });

    it('leaves items without a detailed stat entry unchanged', async () => {
      const detailedResponse = {
        currentPeriod: {
          'GET /api/orders': {
            transactionName: 'GET /api/orders',
            latency: [{ x: 1, y: 200 }],
            throughput: [{ x: 1, y: 5 }],
            errorRate: [{ x: 1, y: 0.01 }],
            impact: 80,
          },
        },
        previousPeriod: {},
      };

      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS },
        detailedResponse
      );

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => {
        const item = result.current.items.find((i) => i.name === 'GET /api/orders');
        expect(item?.latency.series).toBeDefined();
      });

      const untouched = result.current.items.find((i) => i.name === 'POST /api/checkout');
      expect(untouched?.latency.series).toBeUndefined();
    });

    it('coerces undefined y values to null', async () => {
      const detailedResponse = {
        currentPeriod: {
          'GET /api/orders': {
            transactionName: 'GET /api/orders',
            latency: [{ x: 1, y: undefined }],
            throughput: [{ x: 1, y: 5 }],
            errorRate: [{ x: 1, y: null }],
            impact: 80,
          },
        },
        previousPeriod: {},
      };

      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: [TRANSACTION_GROUPS[0]] },
        detailedResponse
      );

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => {
        const item = result.current.items[0];
        expect(item?.latency.series).toBeDefined();
      });

      const item = result.current.items[0];
      expect(item.latency.series?.value).toEqual([{ x: 1, y: null }]);
      expect(item.errorRate.series?.value).toEqual([{ x: 1, y: null }]);
    });

    it('attaches comparison series when previousPeriod has data', async () => {
      const detailedResponse = {
        currentPeriod: {
          'GET /api/orders': {
            transactionName: 'GET /api/orders',
            latency: [{ x: 1, y: 200 }],
            throughput: [{ x: 1, y: 5 }],
            errorRate: [{ x: 1, y: 0.01 }],
            impact: 80,
          },
        },
        previousPeriod: {
          'GET /api/orders': {
            transactionName: 'GET /api/orders',
            latency: [{ x: 1, y: 180 }],
            throughput: [{ x: 1, y: 4 }],
            errorRate: [{ x: 1, y: 0.02 }],
            impact: 75,
          },
        },
      };

      const http = makeHttp(
        { ...EMPTY_MAIN_RESPONSE, transactionGroups: [TRANSACTION_GROUPS[0]] },
        detailedResponse
      );

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => {
        const item = result.current.items[0];
        expect(item?.latency.series?.comparison).toBeDefined();
      });

      const item = result.current.items[0];
      expect(item.latency.series?.comparison).toEqual([{ x: 1, y: 180 }]);
      expect(item.throughput.series?.comparison).toEqual([{ x: 1, y: 4 }]);
      expect(item.errorRate.series?.comparison).toEqual([{ x: 1, y: 0.02 }]);
    });
  });

  describe('loading states', () => {
    it('returns isLoading true while the data source is loading', () => {
      mockedUsePreferredTransactionDataSource.mockReturnValue({
        dataSource: undefined,
        isLoading: true,
        error: undefined,
      });

      const http = makeHttp(EMPTY_MAIN_RESPONSE);
      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading true while main stats are in flight', async () => {
      let resolve!: (v: object) => void;
      const http = {
        get: jest.fn(
          () =>
            new Promise((r) => {
              resolve = r;
            })
        ),
      } as unknown as HttpStart;

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      resolve(EMPTY_MAIN_RESPONSE);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('returns isSparklineLoading true while detailed stats are in flight', async () => {
      let resolveDetailed!: (v: object) => void;
      const http = {
        get: jest.fn().mockImplementation((url: string) => {
          if (url.includes('detailed_statistics')) {
            return new Promise((r) => {
              resolveDetailed = r;
            });
          }
          return Promise.resolve({ ...EMPTY_MAIN_RESPONSE, transactionGroups: TRANSACTION_GROUPS });
        }),
      } as unknown as HttpStart;

      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.isSparklineLoading).toBe(true));

      resolveDetailed(EMPTY_DETAILED_RESPONSE);

      await waitFor(() => expect(result.current.isSparklineLoading).toBe(false));
    });
  });

  describe('error handling', () => {
    it('returns the data source error', async () => {
      const fetchError = new Error('network error');
      mockedUsePreferredTransactionDataSource.mockReturnValue({
        dataSource: undefined,
        isLoading: false,
        error: fetchError,
      });

      const http = makeHttp(EMPTY_MAIN_RESPONSE);
      const { result } = renderHook(() =>
        useServiceFlyoutTransactionData({ http, ...BASE_PARAMS })
      );

      await waitFor(() => expect(result.current.error).toBe(fetchError));
    });

    it('fires a danger toast when the data source fetch fails', async () => {
      const fetchError = new Error('network error');
      mockedUsePreferredTransactionDataSource.mockReturnValue({
        dataSource: undefined,
        isLoading: false,
        error: fetchError,
      });

      const http = makeHttp(EMPTY_MAIN_RESPONSE);
      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      await waitFor(() =>
        expect(mockAddDanger).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Failed to load transaction data' })
        )
      );
    });

    it('does not fetch main stats when data source is unavailable', () => {
      mockedUsePreferredTransactionDataSource.mockReturnValue({
        dataSource: undefined,
        isLoading: false,
        error: new Error('network error'),
      });

      const http = makeHttp(EMPTY_MAIN_RESPONSE);
      renderHook(() => useServiceFlyoutTransactionData({ http, ...BASE_PARAMS }));

      expect(http.get).not.toHaveBeenCalled();
    });
  });
});
