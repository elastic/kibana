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
jest.mock('../../../../common/utils/esql/create_exemplars_query', () => ({
  createExemplarsQuery: jest.fn(),
}));
const mockReportError = jest.fn();
jest.mock('../../../chart/hooks/use_report_chart_section_error', () => ({
  useReportChartSectionError: jest.fn(() => mockReportError),
}));

import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { Filter } from '@kbn/es-query';
import { METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/discover-utils';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { DataSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import { createExemplarsQuery } from '../../../../common/utils/esql/create_exemplars_query';
import type { ParsedMetricItem } from '../../../../types';
import { useFetchExemplars, type UseFetchExemplarsParams } from './use_fetch_exemplars';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockCreateExemplarsQuery = createExemplarsQuery as jest.MockedFunction<
  typeof createExemplarsQuery
>;

const TEST_PROFILE_ID = 'metrics-data-source-profile';
const TEST_WHERE_STATEMENTS = ['host.name == "a"'];
const TEST_METADATA_FIELDS = ['_ignored'];
const TEST_FILTERS: Filter[] = [
  {
    meta: { key: 'attributes.http.route' },
    query: { match_phrase: { 'attributes.http.route': '/orders' } },
  },
  {
    meta: { key: 'metrics.http.server.request.duration', type: 'range' },
    query: { range: { 'metrics.http.server.request.duration': { gte: 0.5 } } },
  },
];
const TEST_ESQL_VARIABLES: ESQLControlVariable[] = [
  { key: 'service', value: 'checkout-service', type: ESQLVariableType.VALUES },
];
const TEST_ESQL_QUERY = `SET exemplars = true;
TS metrics-generic.otel-default
  | WHERE host.name == "a"
  | STATS PERCENTILE(metrics.http.server.request.duration, 95) BY TBUCKET(100)`;
const TEST_COLUMNS = ['@timestamp', 'metric_name', 'value', 'trace_id', 'span_id'].map((name) => ({
  name,
  type: 'keyword',
}));
const TEST_ROWS = [
  [1_700_000_000_000, 'http.server.request.duration', 0.42, 'trace-abc', 'span-xyz'],
];
const IDLE_FETCH = { exemplars: undefined, hasError: false, isLoading: false };

const mockMetric: ParsedMetricItem = {
  metricName: 'metrics.http.server.request.duration',
  indexName: 'metrics-generic.otel-default',
  units: ['ms'],
  metricTypes: ['histogram'],
  fieldTypes: [ES_FIELD_TYPES.TDIGEST],
  dimensionFields: [{ name: 'attributes.http.route' }],
};

const createParams = (
  overrides: Partial<UseFetchExemplarsParams> = {}
): UseFetchExemplarsParams => ({
  fetchParams: getFetchParamsMock({
    query: { esql: 'TS metrics-generic.otel-default' },
    dataSource: createMockEsqlSource([], [], '@timestamp', 'TS metrics-generic.otel-default'),
    timeRange: { from: 'now-15m', to: 'now' },
    filters: TEST_FILTERS,
    esqlVariables: TEST_ESQL_VARIABLES,
  }),
  services: {
    data: { search: { search: jest.fn() } },
    uiSettings: {},
  } as unknown as ChartSectionProps['services'],
  metricItem: mockMetric,
  whereStatements: TEST_WHERE_STATEMENTS,
  metadataFields: TEST_METADATA_FIELDS,
  gridSettings: METRICS_GRID_SETTINGS_DEFAULTS,
  profileId: TEST_PROFILE_ID,
  isSupported: true,
  isComponentVisible: true,
  clusterSupport: { status: 'supported' },
  ...overrides,
});

// Lets promise chains settle for assertions whose expected outcome is "nothing happened".
const flushAsync = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('useFetchExemplars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateExemplarsQuery.mockReturnValue(TEST_ESQL_QUERY);
    mockExecuteEsqlQuery.mockResolvedValue({
      documents: [],
      rawResponse: {
        columns: TEST_COLUMNS,
        values: TEST_ROWS,
        requestParams: { query: TEST_ESQL_QUERY },
      },
      requestParams: { query: TEST_ESQL_QUERY },
    });
  });

  describe('when the cluster gate blocks per-chart searches', () => {
    it('does not fetch when exemplars are disabled', async () => {
      const params = createParams({ clusterSupport: { status: 'disabled' } });
      const reportedLoading: boolean[] = [];
      const { result } = renderHook(() => {
        const state = useFetchExemplars(params);
        reportedLoading.push(state.isLoading);
        return state;
      });

      expect(result.current.isLoading).toBe(false);
      expect(reportedLoading).not.toContain(true);
      expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();

      await flushAsync();
      expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(result.current).toEqual(IDLE_FETCH);
      expect(reportedLoading).not.toContain(true);
    });

    it('stays loading without fetching while cluster support is still being checked', async () => {
      const params = createParams({ clusterSupport: { status: 'checking' } });
      const { result } = renderHook(() => useFetchExemplars(params));

      await flushAsync();
      expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(result.current).toEqual({ ...IDLE_FETCH, isLoading: true });
    });

    it('surfaces an unsupported cluster without a per-chart search', async () => {
      const errorMessage = 'verification_exception: unknown setting [exemplars]';
      const params = createParams({
        clusterSupport: { status: 'unsupported', errorMessage },
      });
      const { result } = renderHook(() => useFetchExemplars(params));

      await flushAsync();
      expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        exemplars: undefined,
        hasError: true,
        errorMessage,
        isLoading: false,
      });
    });

    it('surfaces a transient probe failure without a per-chart search', async () => {
      const errorMessage = 'network failure';
      const params = createParams({ clusterSupport: { status: 'failed', errorMessage } });
      const { result } = renderHook(() => useFetchExemplars(params));

      await flushAsync();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        exemplars: undefined,
        hasError: true,
        errorMessage,
        isLoading: false,
      });
    });
  });

  it('does nothing without a data source', async () => {
    const params = createParams();
    params.fetchParams = { ...params.fetchParams, dataSource: undefined as unknown as DataSource };

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual(IDLE_FETCH);
  });

  it('does not fetch while the grid is hidden', async () => {
    const params = createParams({ isComponentVisible: false });

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual(IDLE_FETCH);
  });

  it('does not fetch when the chart is unsupported', async () => {
    const params = createParams({ isSupported: false });

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockCreateExemplarsQuery).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual(IDLE_FETCH);
  });

  it('does not fetch when the chart query is empty', async () => {
    mockCreateExemplarsQuery.mockReturnValue('');
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual(IDLE_FETCH);
  });

  it('returns the exemplar columns and rows on a successful fetch', async () => {
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await waitFor(() => expect(result.current.exemplars).toBeDefined());
    expect(result.current).toEqual({
      exemplars: { columns: TEST_COLUMNS, values: TEST_ROWS },
      hasError: false,
      isLoading: false,
    });
  });

  it('returns remote-cluster rows, including exemplars with no trace or span id', async () => {
    const values = [[1_700_000_000_000, 'http.server.request.duration', 0.42, null, null]];
    mockExecuteEsqlQuery.mockResolvedValue({
      documents: [],
      rawResponse: {
        columns: TEST_COLUMNS,
        values,
        requestParams: { query: TEST_ESQL_QUERY },
      },
      requestParams: { query: TEST_ESQL_QUERY },
    });
    const params = createParams({ originalSource: 'remote:metrics-*' });

    const { result } = renderHook(() => useFetchExemplars(params));

    await waitFor(() => expect(result.current.exemplars).toBeDefined());
    expect(result.current).toEqual({
      exemplars: { columns: TEST_COLUMNS, values },
      hasError: false,
      isLoading: false,
    });
    expect(mockCreateExemplarsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ originalSource: 'remote:metrics-*' })
    );
  });

  it('forwards the chart query inputs and request filters under the exemplars execution context', async () => {
    const params = createParams({ originalSource: 'remote:metrics-generic.otel-default' });

    renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockCreateExemplarsQuery).toHaveBeenCalledWith({
      metricItem: mockMetric,
      whereStatements: TEST_WHERE_STATEMENTS,
      metadataFields: TEST_METADATA_FIELDS,
      originalSource: 'remote:metrics-generic.otel-default',
      gridSettings: METRICS_GRID_SETTINGS_DEFAULTS,
    });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      esqlQuery: TEST_ESQL_QUERY,
      search: params.services.data.search.search,
      signal: expect.any(AbortSignal),
      timeFieldName: '@timestamp',
      timeRange: params.fetchParams.timeRange,
      filters: TEST_FILTERS,
      variables: TEST_ESQL_VARIABLES,
      uiSettings: params.services.uiSettings,
      profileId: TEST_PROFILE_ID,
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });
  });

  it('drops the previous rows while a refetch is in flight', async () => {
    const params = createParams();
    const { result, rerender } = renderHook(
      (props: UseFetchExemplarsParams) => useFetchExemplars(props),
      { initialProps: params }
    );
    await waitFor(() => expect(result.current.exemplars).toBeDefined());

    mockExecuteEsqlQuery.mockReturnValueOnce(new Promise(() => {}));
    rerender({
      ...params,
      fetchParams: {
        ...params.fetchParams,
        lastReloadRequestTime: params.fetchParams.lastReloadRequestTime + 1,
        timeRange: { ...params.fetchParams.timeRange },
      },
    });
    await flushAsync();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ ...IDLE_FETCH, isLoading: true });
  });

  it('fetches again when the Discover fetch changes', async () => {
    const params = createParams();
    const { rerender } = renderHook((props: UseFetchExemplarsParams) => useFetchExemplars(props), {
      initialProps: params,
    });
    await flushAsync();

    rerender({
      ...params,
      fetchParams: {
        ...params.fetchParams,
        lastReloadRequestTime: params.fetchParams.lastReloadRequestTime + 1,
        timeRange: { ...params.fetchParams.timeRange },
      },
    });
    await flushAsync();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('does not refetch when a replaced metric item builds the same query', async () => {
    const params = createParams();
    const { rerender } = renderHook((props: UseFetchExemplarsParams) => useFetchExemplars(props), {
      initialProps: params,
    });
    await flushAsync();

    rerender({
      ...params,
      metricItem: { ...mockMetric },
      whereStatements: [...TEST_WHERE_STATEMENTS],
      metadataFields: [...TEST_METADATA_FIELDS],
    });
    await flushAsync();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('refetches when the exemplar query changes', async () => {
    const params = createParams();
    const { rerender } = renderHook((props: UseFetchExemplarsParams) => useFetchExemplars(props), {
      initialProps: params,
    });
    await flushAsync();

    mockCreateExemplarsQuery.mockReturnValue(`${TEST_ESQL_QUERY}\n| KEEP value`);
    rerender({
      ...params,
      metricItem: { ...mockMetric, metricName: 'other.metric' },
    });
    await flushAsync();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('stays loading while the request has not been fetched', async () => {
    mockExecuteEsqlQuery.mockReturnValue(new Promise(() => {}));
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current).toEqual({ ...IDLE_FETCH, isLoading: true });
  });

  describe('when the row fetch rejects', () => {
    it('swallows aborts without reporting', async () => {
      mockExecuteEsqlQuery.mockRejectedValue(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
      );
      const params = createParams();

      const { result } = renderHook(() => useFetchExemplars(params));

      await flushAsync();
      expect(mockReportError).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        exemplars: undefined,
        hasError: false,
        errorMessage: 'The operation was aborted',
        isLoading: false,
      });
    });

    it('reports other errors once and marks the fetch failed', async () => {
      const fetchError = new Error('network failure');
      mockExecuteEsqlQuery.mockRejectedValue(fetchError);
      const params = createParams();

      const { result } = renderHook(() => useFetchExemplars(params));

      await waitFor(() => expect(mockReportError).toHaveBeenCalledTimes(1));
      expect(mockReportError).toHaveBeenCalledWith({
        error: fetchError,
        source: 'useFetchExemplars',
        labels: { profile_id: TEST_PROFILE_ID },
      });
      expect(result.current).toEqual({
        exemplars: undefined,
        hasError: true,
        errorMessage: 'network failure',
        isLoading: false,
      });
    });
  });

  it('does not re-render in a loop while mounted with stable props', async () => {
    const params = createParams();
    let renders = 0;
    const Probe = () => {
      renders++;
      useFetchExemplars(params);
      return null;
    };

    render(<Probe />);
    await act(async () => new Promise<void>((resolve) => setTimeout(resolve, 100)));

    expect(renders).toBeLessThan(10);
  });
});
