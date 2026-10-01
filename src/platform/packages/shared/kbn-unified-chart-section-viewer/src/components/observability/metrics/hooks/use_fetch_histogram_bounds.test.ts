/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../utils/execute_esql_query', () => ({
  executeEsqlQuery: jest.fn(),
}));
jest.mock('../../../../hooks', () => ({
  useFeatureFlag: jest.fn(() => true),
}));
const mockReportError = jest.fn();
jest.mock('../../../chart/hooks/use_report_chart_section_error', () => ({
  useReportChartSectionError: jest.fn(() => mockReportError),
}));
const mockTrackEsqlQueryFailure = jest.fn();
jest.mock('../../../../context/ebt_telemetry_context', () => ({
  useTelemetry: () => ({
    trackEsqlQueryFailure: mockTrackEsqlQueryFailure,
  }),
}));

import { act, renderHook, waitFor } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import type { ParsedMetricItem } from '../../../../types';
import { useFeatureFlag } from '../../../../hooks';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import { useFetchHistogramBounds } from './use_fetch_histogram_bounds';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<typeof useFeatureFlag>;

type BoundsRow = Record<string, number | string | null>;

const resolved = (documents: BoundsRow[]) =>
  Promise.resolve({ documents, rawResponse: {}, requestParams: { query: '' } });

const deferred = () => {
  let resolve: (rows: BoundsRow[]) => void = () => {};
  const promise = new Promise<Awaited<ReturnType<typeof resolved>>>((resolvePromise) => {
    resolve = (rows) =>
      resolvePromise({ documents: rows, rawResponse: {}, requestParams: { query: '' } });
  });
  return { promise, resolve };
};

const deferredRejection = () => {
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<Awaited<ReturnType<typeof resolved>>>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  return { promise, reject };
};

const createMetric = (overrides: Partial<ParsedMetricItem>): ParsedMetricItem => ({
  metricName: 'latency.exp',
  indexName: 'metrics-a',
  units: [null],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
  dimensionFields: [],
  ...overrides,
});

const histogramA = createMetric({ indexName: 'metrics-a' });
const histogramB = createMetric({ indexName: 'metrics-b' });
const gauge = createMetric({
  metricName: 'cpu.usage',
  metricTypes: ['gauge'],
  fieldTypes: [ES_FIELD_TYPES.DOUBLE],
});

const services = {
  data: { search: { search: jest.fn() } },
  uiSettings: {},
} as unknown as ChartSectionProps['services'];

const dataView = {
  getIndexPattern: () => 'metrics-*',
  isTimeBased: () => true,
  timeFieldName: '@timestamp',
} as unknown as DataView;

type HookProps = Parameters<typeof useFetchHistogramBounds>[0];

const createProps = (overrides: Partial<HookProps> = {}): HookProps => ({
  enabled: true,
  metricItems: [histogramA, histogramB],
  fetchParams: getFetchParamsMock({
    dataView,
    query: { esql: 'TS metrics-*' },
    filters: [],
    esqlVariables: [],
    relativeTimeRange: { from: 'now-15m', to: 'now' },
  }),
  services,
  whereStatements: [],
  originalSource: 'metrics-*',
  profileId: 'test-profile-id',
  ...overrides,
});

const renderBoundsHook = (initialProps: HookProps) =>
  renderHook((props: HookProps) => useFetchHistogramBounds(props), { initialProps });

const getQueriedSources = () =>
  mockExecuteEsqlQuery.mock.calls.map(([{ esqlQuery }]) =>
    esqlQuery.split('\n').find((line) => line.startsWith('TS '))
  );

describe('useFetchHistogramBounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockExecuteEsqlQuery.mockImplementation(() => resolved([{ min_value: 1, max_value: 5 }]));
  });

  it('runs one request per chart in parallel and keeps only min < max', async () => {
    mockExecuteEsqlQuery
      .mockImplementationOnce(() => resolved([{ min_value: 1, max_value: 5 }]))
      .mockImplementationOnce(() => resolved([{ min_value: 3, max_value: 3 }]));

    const { result } = renderBoundsHook(createProps());

    await waitFor(() =>
      expect(result.current.bounds.get('metrics-a::latency.exp')).toEqual({ min: 1, max: 5 })
    );

    expect(getQueriedSources()).toEqual(['TS metrics-a', 'TS metrics-b']);
    expect(result.current.bounds.has('metrics-b::latency.exp')).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('stays loading with no bounds until every chart settles', async () => {
    const slow = deferred();
    mockExecuteEsqlQuery
      .mockImplementationOnce(() => resolved([{ min_value: 1, max_value: 5 }]))
      .mockImplementationOnce(() => slow.promise);

    const { result } = renderBoundsHook(createProps());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));
    expect(result.current).toEqual({ loading: true, bounds: new Map() });

    await act(async () => {
      slow.resolve([{ min_value: 2, max_value: 4 }]);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.bounds.size).toBe(2);
  });

  it('sends a separate request for each chart on the same index', async () => {
    const tdigestA = createMetric({
      metricName: 'latency.tdigest',
      indexName: 'metrics-a',
      fieldTypes: [ES_FIELD_TYPES.TDIGEST],
    });
    const { result } = renderBoundsHook(createProps({ metricItems: [histogramA, tdigestA] }));

    await waitFor(() => expect(result.current.bounds.size).toBe(2));

    expect(getQueriedSources()).toEqual(['TS metrics-a', 'TS metrics-a']);
    expect(mockExecuteEsqlQuery.mock.calls.map(([{ esqlQuery }]) => esqlQuery)).toEqual([
      expect.stringContaining('MIN(latency.exp)'),
      expect.stringContaining('MIN(latency.tdigest)'),
    ]);
    expect(mockExecuteEsqlQuery.mock.calls[0][0].esqlQuery).not.toContain('latency.tdigest');
  });

  it('passes the relative time range, filters, variables, and bounds execution context, without approximation', async () => {
    renderBoundsHook(
      createProps({
        metricItems: [histogramA],
        fetchParams: {
          ...createProps().fetchParams,
          isApproximate: true,
        },
      })
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1));

    const [[params]] = mockExecuteEsqlQuery.mock.calls;
    expect(params).toEqual(
      expect.objectContaining({
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [],
        variables: [],
        profileId: 'test-profile-id',
        executionContextName: MetricsExecutionContextName.HISTOGRAM_BOUNDS,
      })
    );
    expect(params).not.toHaveProperty('approximation');
    expect(params).not.toHaveProperty('isApproximate');
  });

  it('omits a chart when the response has no row or null bounds', async () => {
    mockExecuteEsqlQuery
      .mockImplementationOnce(() => resolved([]))
      .mockImplementationOnce(() => resolved([{ min_value: null, max_value: null }]));

    const { result } = renderBoundsHook(createProps());

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.bounds.has('metrics-a::latency.exp')).toBe(false);
    expect(result.current.bounds.has('metrics-b::latency.exp')).toBe(false);
  });

  it('keeps the other chart bounds when one chart request fails, reports it, and does not retry', async () => {
    const failure = new Error('verification_exception');
    mockExecuteEsqlQuery
      .mockImplementationOnce(() => Promise.reject(failure))
      .mockImplementationOnce(() => resolved([{ min_value: 2, max_value: 8 }]));

    const { result } = renderBoundsHook(createProps());

    await waitFor(() =>
      expect(result.current.bounds.get('metrics-b::latency.exp')).toEqual({ min: 2, max: 8 })
    );

    expect(result.current.bounds.get('metrics-a::latency.exp')).toEqual({
      error: failure,
    });
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith({
      error: failure,
      source: 'useFetchHistogramBounds',
      labels: {
        page: 'metrics_fetch_histogram_bounds',
        profile_id: 'test-profile-id',
        chart_id: 'metrics-a::latency.exp',
      },
    });
    expect(mockTrackEsqlQueryFailure).toHaveBeenCalledTimes(1);
    expect(mockTrackEsqlQueryFailure).toHaveBeenCalledWith(
      expect.objectContaining({ error_category: expect.any(String) })
    );
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('does not report a request aborted by the next fetch', async () => {
    mockExecuteEsqlQuery.mockImplementationOnce(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );

    const initialProps = createProps({ metricItems: [histogramA] });
    const { result, rerender } = renderBoundsHook(initialProps);

    rerender({ ...initialProps, metricItems: [histogramB] });
    await waitFor(() =>
      expect(result.current.bounds.get('metrics-b::latency.exp')).toEqual({ min: 1, max: 5 })
    );

    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockTrackEsqlQueryFailure).not.toHaveBeenCalled();
  });

  it('keeps the previous bounds while a refetch is loading', async () => {
    const initialProps = createProps({ metricItems: [histogramA] });
    const { result, rerender } = renderBoundsHook(initialProps);

    await waitFor(() =>
      expect(result.current.bounds.get('metrics-a::latency.exp')).toEqual({ min: 1, max: 5 })
    );
    const previousBounds = result.current.bounds;

    const slow = deferred();
    mockExecuteEsqlQuery.mockImplementationOnce(() => slow.promise);
    rerender({
      ...initialProps,
      fetchParams: {
        ...initialProps.fetchParams,
        relativeTimeRange: { from: 'now-1h', to: 'now' },
      },
    });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.bounds).toBe(previousBounds);

    await act(async () => {
      slow.resolve([{ min_value: 9, max_value: 11 }]);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.bounds.get('metrics-a::latency.exp')).toEqual({
      min: 9,
      max: 11,
    });
  });

  it('reports every chart failure once, after all requests settle', async () => {
    const failureA = new Error('verification_exception');
    const failureB = new Error('verification_exception');
    const slowA = deferredRejection();
    const slowB = deferredRejection();
    mockExecuteEsqlQuery
      .mockImplementationOnce(() => slowA.promise)
      .mockImplementationOnce(() => slowB.promise);

    const { result } = renderBoundsHook(createProps());

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));
    await act(async () => {
      slowA.reject(failureA);
    });
    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockTrackEsqlQueryFailure).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      slowB.reject(failureB);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith({
      error: expect.any(AggregateError),
      source: 'useFetchHistogramBounds',
      labels: {
        page: 'metrics_fetch_histogram_bounds',
        profile_id: 'test-profile-id',
      },
    });
    expect(mockReportError.mock.calls[0][0].labels).not.toHaveProperty('chart_id');
    expect(mockTrackEsqlQueryFailure).toHaveBeenCalledTimes(1);
    expect(result.current.bounds.get('metrics-a::latency.exp')).toEqual({
      error: failureA,
    });
    expect(result.current.bounds.get('metrics-b::latency.exp')).toEqual({
      error: failureB,
    });
  });

  it('sends no request when the heatmaps feature flag is off', () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderBoundsHook(createProps());

    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual({ loading: false, bounds: new Map() });
  });

  it('sends no request when disabled, and fetches once enabled', async () => {
    const initialProps = createProps({ enabled: false });
    const { result, rerender } = renderBoundsHook(initialProps);

    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual({ loading: false, bounds: new Map() });

    rerender({ ...initialProps, enabled: true });

    await waitFor(() => expect(result.current.bounds.size).toBe(2));
    expect(result.current.bounds.size).toBe(2);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('clears the bounds when disabled after a fetch', async () => {
    const initialProps = createProps();
    const { result, rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(result.current.bounds.size).toBe(2));

    rerender({ ...initialProps, enabled: false });

    expect(result.current).toEqual({ loading: false, bounds: new Map() });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('sends no request when the page has only gauges', () => {
    const { result } = renderBoundsHook(createProps({ metricItems: [gauge] }));

    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual({ loading: false, bounds: new Map() });
  });

  it('does not refetch when metric items are re-created with the same content', async () => {
    const initialProps = createProps();
    const { rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));

    rerender({
      ...initialProps,
      metricItems: [
        { ...histogramA, dimensionFields: [{ name: 'host.name' }] },
        { ...histogramB, dimensionFields: [{ name: 'host.name' }] },
      ],
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('refetches and replaces the bounds when the page changes', async () => {
    const initialProps = createProps({ metricItems: [histogramA] });
    const { result, rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(result.current.bounds.has('metrics-a::latency.exp')).toBe(true));

    rerender({ ...initialProps, metricItems: [histogramB] });

    await waitFor(() => expect(result.current.bounds.has('metrics-b::latency.exp')).toBe(true));

    expect(result.current.bounds.has('metrics-a::latency.exp')).toBe(false);
    expect(getQueriedSources()).toEqual(['TS metrics-a', 'TS metrics-b']);
  });

  it('refetches when the time range, filters, WHERE clauses, or ES|QL variables change', async () => {
    const initialProps = createProps({ metricItems: [histogramA] });
    const { rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1));

    const withNewTimeRange = {
      ...initialProps,
      fetchParams: {
        ...initialProps.fetchParams,
        relativeTimeRange: { from: 'now-1h', to: 'now' },
      },
    };
    rerender(withNewTimeRange);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));

    const withNewFilters = {
      ...withNewTimeRange,
      fetchParams: {
        ...withNewTimeRange.fetchParams,
        filters: [{ meta: {}, query: { match_phrase: { 'host.name': 'a' } } }],
      },
    };
    rerender(withNewFilters);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3));

    const withNewWhere = { ...withNewFilters, whereStatements: ['host.name == "a"'] };
    rerender(withNewWhere);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(4));

    rerender({
      ...withNewWhere,
      fetchParams: {
        ...withNewWhere.fetchParams,
        esqlVariables: [{ key: 'host', value: 'a', type: 'values' }],
      } as HookProps['fetchParams'],
    });

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(5));
  });

  it('does not refetch on chart-only updates: a new abort controller, reload time, or Fast mode without a new search session', async () => {
    const initialProps = createProps({ metricItems: [histogramA] });
    const { rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1));

    rerender({
      ...initialProps,
      fetchParams: {
        ...initialProps.fetchParams,
        abortController: new AbortController(),
        lastReloadRequestTime: initialProps.fetchParams.lastReloadRequestTime + 1000,
        isApproximate: true,
      },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('refetches when Discover starts a new search session', async () => {
    const initialProps = createProps({ metricItems: [histogramA] });
    const { rerender } = renderBoundsHook(initialProps);

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1));

    rerender({
      ...initialProps,
      fetchParams: {
        ...initialProps.fetchParams,
        searchSessionId: 'next-session',
      },
    });

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2));
  });

  it('ignores a response that lands after the page changed', async () => {
    const stale = deferred();
    mockExecuteEsqlQuery.mockImplementationOnce(() => stale.promise);

    const initialProps = createProps({ metricItems: [histogramA] });
    const { result, rerender } = renderBoundsHook(initialProps);

    rerender({ ...initialProps, metricItems: [histogramB] });
    await waitFor(() => expect(result.current.bounds.has('metrics-b::latency.exp')).toBe(true));

    await act(async () => {
      stale.resolve([{ min_value: 1, max_value: 2 }]);
    });

    expect(result.current.bounds.has('metrics-a::latency.exp')).toBe(false);
  });
});
