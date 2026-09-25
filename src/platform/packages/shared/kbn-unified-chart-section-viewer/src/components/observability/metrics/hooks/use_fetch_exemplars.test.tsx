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
const mockProbe = jest.fn();
jest.mock('../context/exemplars_availability_provider', () => ({
  useExemplarsAvailabilityProbe: jest.fn(() => mockProbe),
}));
jest.mock('../../../../hooks/use_feature_flag', () => ({
  useFeatureFlag: jest.fn(),
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
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { FEATURE_FLAGS } from '../../../../common/constants';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import { createExemplarsQuery } from '../../../../common/utils/esql/create_exemplars_query';
import type { ParsedMetricItem } from '../../../../types';
import { useFetchExemplars, type UseFetchExemplarsParams } from './use_fetch_exemplars';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<typeof useFeatureFlag>;
const mockCreateExemplarsQuery = createExemplarsQuery as jest.MockedFunction<
  typeof createExemplarsQuery
>;

const TEST_PROFILE_ID = 'metrics-data-source-profile';
const TEST_FILTERS: Filter[] = [
  {
    meta: { key: 'attributes.http.route' },
    query: { match_phrase: { 'attributes.http.route': '/orders' } },
  },
];
const TEST_ESQL_QUERY =
  'FROM exemplars-generic.otel-default | WHERE metric_name == "http.server.request.duration" | KEEP @timestamp, metric_name, value, trace.id, span.id | SORT @timestamp DESC | LIMIT 500';
const TEST_COLUMNS = ['@timestamp', 'metric_name', 'value', 'trace.id', 'span.id'].map((name) => ({
  name,
  type: 'keyword',
}));
const TEST_ROWS = [
  [1_700_000_000_000, 'http.server.request.duration', 0.42, 'trace-abc', 'span-xyz'],
];

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
    dataView: {
      getIndexPattern: () => 'metrics-generic.otel-default',
      isTimeBased: () => true,
      timeFieldName: '@timestamp',
    } as unknown as DataView,
    timeRange: { from: 'now-15m', to: 'now' },
    filters: TEST_FILTERS,
  }),
  services: {
    data: { search: { search: jest.fn() } },
    uiSettings: {},
  } as unknown as ChartSectionProps['services'],
  metricItem: mockMetric,
  profileId: TEST_PROFILE_ID,
  ...overrides,
});

// Lets promise chains settle for assertions whose expected outcome is "nothing happened".
const flushAsync = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('useFetchExemplars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(true);
    mockCreateExemplarsQuery.mockReturnValue(TEST_ESQL_QUERY);
    mockProbe.mockResolvedValue(
      new Map([['exemplars-generic.otel-default', new Set([mockMetric.metricName])]])
    );
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

  describe('when the feature flag is off', () => {
    beforeEach(() => {
      mockUseFeatureFlag.mockReturnValue(false);
    });

    it('neither probes nor fetches, and returns undefined', async () => {
      const params = createParams();
      const { result } = renderHook(() => useFetchExemplars(params));

      await flushAsync();
      expect(mockProbe).not.toHaveBeenCalled();
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(result.current).toBeUndefined();
    });
  });

  it('reads the exemplars feature flag with its registered default', async () => {
    const params = createParams();
    renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockUseFeatureFlag).toHaveBeenCalledWith(FEATURE_FLAGS.IS_EXEMPLARS_ENABLED, false);
  });

  it('does nothing without a data view', async () => {
    const params = createParams();
    params.fetchParams = { ...params.fetchParams, dataView: null as unknown as DataView };

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('does not probe when the metric cannot have exemplars (empty query)', async () => {
    mockCreateExemplarsQuery.mockReturnValue('');
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('does not probe for a non-OTel metric', async () => {
    const params = createParams({
      metricItem: { ...mockMetric, indexName: 'metrics-system.cpu-default' },
    });

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).not.toHaveBeenCalled();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('probes but does not fetch when the metric has no exemplars', async () => {
    mockProbe.mockResolvedValue(new Map());
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('does not fetch when the metric only has exemplars in a different data stream', async () => {
    mockProbe.mockResolvedValue(
      new Map([['exemplars-payments.otel-prod', new Set([mockMetric.metricName])]])
    );
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('scopes the availability check to the user-typed source when it is one concrete index', async () => {
    mockProbe.mockResolvedValue(
      new Map([['exemplars-generic.otel-production', new Set([mockMetric.metricName])]])
    );
    const params = createParams({ originalSource: 'metrics-generic.otel-production' });

    const { result } = renderHook(() => useFetchExemplars(params));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('returns the exemplar columns and rows on a successful fetch', async () => {
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current).toEqual({ columns: TEST_COLUMNS, values: TEST_ROWS });
  });

  it('forwards the request parameters under the exemplars execution context', async () => {
    const params = createParams();

    renderHook(() => useFetchExemplars(params));

    await flushAsync();
    expect(mockProbe).toHaveBeenCalledWith({
      fetchId: params.fetchParams.lastReloadRequestTime,
      search: params.services.data.search.search,
      dataView: params.fetchParams.dataView,
      timeRange: params.fetchParams.timeRange,
      uiSettings: params.services.uiSettings,
      profileId: TEST_PROFILE_ID,
      onError: expect.any(Function),
    });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      esqlQuery: TEST_ESQL_QUERY,
      search: params.services.data.search.search,
      signal: expect.any(AbortSignal),
      dataView: params.fetchParams.dataView,
      timeRange: params.fetchParams.timeRange,
      filters: TEST_FILTERS,
      uiSettings: params.services.uiSettings,
      profileId: TEST_PROFILE_ID,
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });
  });

  it('probes again under the new fetch id when the Discover fetch changes', async () => {
    const params = createParams();
    const { rerender } = renderHook((props: UseFetchExemplarsParams) => useFetchExemplars(props), {
      initialProps: params,
    });
    await flushAsync();

    const nextFetchParams = {
      ...params.fetchParams,
      lastReloadRequestTime: params.fetchParams.lastReloadRequestTime + 1,
      timeRange: { ...params.fetchParams.timeRange },
    };
    rerender({ ...params, fetchParams: nextFetchParams });
    await flushAsync();

    expect(mockProbe).toHaveBeenCalledTimes(2);
    expect(mockProbe.mock.calls[1][0].fetchId).toBe(nextFetchParams.lastReloadRequestTime);
  });

  it('routes probe errors to the chart section error reporter', async () => {
    const params = createParams();
    renderHook(() => useFetchExemplars(params));
    await flushAsync();

    const probeError = new Error('probe failed');
    mockProbe.mock.calls[0][0].onError(probeError);

    expect(mockReportError).toHaveBeenCalledWith({
      error: probeError,
      source: 'useFetchExemplars',
      labels: { profile_id: TEST_PROFILE_ID },
    });
  });

  it('returns undefined while the fetch is in flight', () => {
    mockExecuteEsqlQuery.mockReturnValue(new Promise(() => {}));
    const params = createParams();

    const { result } = renderHook(() => useFetchExemplars(params));

    expect(result.current).toBeUndefined();
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
      expect(result.current).toBeUndefined();
    });

    it('reports other errors once and returns undefined', async () => {
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
      expect(result.current).toBeUndefined();
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
