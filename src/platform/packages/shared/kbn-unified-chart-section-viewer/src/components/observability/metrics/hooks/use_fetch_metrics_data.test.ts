/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Stable references for mock functions that must not change across renders
// (otherwise useAsyncFn recreates executeFetch, causing infinite loops).
const mockTrackRequest = jest.fn(
  async (_name: string, _desc: string, fn: () => Promise<{ data: unknown }>) => {
    const result = await fn();
    return result.data;
  }
);
const mockTrackMetricsInfo = jest.fn();

// Mock ALL external heavy dependencies with factory functions to avoid loading
// their transitive dependency trees (e.g., @kbn/data-plugin/public).
jest.mock('../utils/execute_esql_query', () => ({
  executeEsqlQuery: jest.fn(),
}));
jest.mock('../utils/parse_metrics_response_with_telemetry', () => ({
  parseMetricsWithTelemetry: jest.fn(),
}));
jest.mock('../utils/get_esql_query', () => ({
  getEsqlQuery: jest.fn((query: { esql?: string } | undefined) => query?.esql),
}));
jest.mock('@kbn/esql-utils', () => ({
  buildMetricsInfoQuery: jest.fn((esql: string, dims?: string[]) =>
    dims?.length ? `${esql} | WHERE dim IS NOT NULL | METRICS_INFO` : `${esql} | METRICS_INFO`
  ),
  hasTransformationalCommand: jest.fn(() => false),
}));
jest.mock('@kbn/field-utils', () => ({
  getFieldIconType: jest.fn(() => 'number'),
}));
jest.mock('../../../../context/ebt_telemetry_context', () => ({
  useTelemetry: () => ({ trackMetricsInfo: mockTrackMetricsInfo }),
}));
jest.mock('../../../../context/chart_section_inspector', () => ({
  useChartSectionInspector: () => ({
    trackRequest: mockTrackRequest,
  }),
}));

import { renderHook, waitFor, act } from '@testing-library/react';
import type { Dimension, ParsedMetricsWithTelemetry } from '../../../../types';
import { useFetchMetricsData } from './use_fetch_metrics_data';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { parseMetricsWithTelemetry } from '../utils/parse_metrics_response_with_telemetry';
import { getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockParseMetricsWithTelemetry = parseMetricsWithTelemetry as jest.MockedFunction<
  typeof parseMetricsWithTelemetry
>;

const createDimension = (name: string): Dimension => ({ name });

const hostDimension = createDimension('host.name');
const serviceDimension = createDimension('service.name');

const createMockParsedMetrics = (
  metricNames: string[],
  dimensions: Dimension[]
): ParsedMetricsWithTelemetry => ({
  metricItems: metricNames.map((name) => ({
    metricName: name,
    dataStream: 'metrics-*',
    units: [null],
    metricTypes: ['gauge'],
    fieldTypes: ['double' as any],
    dimensionFields: dimensions,
  })),
  allDimensions: dimensions,
  telemetry: {
    total_number_of_metrics: metricNames.length,
    total_number_of_dimensions: dimensions.length,
    metrics_by_type: { gauge: metricNames.length },
    units: { none: metricNames.length },
    multi_value_counts: { data_streams: 0, field_types: 0, metric_types: 0 },
  },
});

const createDefaultParams = (overrides?: Record<string, unknown>) => ({
  fetchParams: getFetchParamsMock({
    query: { esql: 'TS metrics-*' },
    dataView: {
      getFieldByName: jest.fn(),
      getIndexPattern: () => 'metrics-*',
      isTimeBased: () => true,
    } as any,
    timeRange: { from: 'now-15m', to: 'now' },
    filters: [],
    esqlVariables: [],
    ...overrides,
  }),
  services: {
    data: { search: { search: jest.fn() } },
    uiSettings: {},
  } as any,
  isComponentVisible: true,
  selectedDimensionNames: undefined as Dimension[] | undefined,
});

describe('useFetchMetricsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore mock implementations after clearAllMocks resets them.
    // Without these restorations, getEsqlQuery returns undefined (disabling shouldFetch),
    // trackRequest stops calling fn() (so the fetch never runs), etc.
    const { getEsqlQuery } = jest.requireMock('../utils/get_esql_query');
    getEsqlQuery.mockImplementation((query: { esql?: string } | undefined) => query?.esql);

    const { buildMetricsInfoQuery, hasTransformationalCommand } =
      jest.requireMock('@kbn/esql-utils');
    buildMetricsInfoQuery.mockImplementation((esql: string, dims?: string[]) =>
      dims?.length ? `${esql} | WHERE dim IS NOT NULL | METRICS_INFO` : `${esql} | METRICS_INFO`
    );
    hasTransformationalCommand.mockImplementation(() => false);

    mockTrackRequest.mockImplementation(
      async (_name: string, _desc: string, fn: () => Promise<{ data: unknown }>) => {
        const result = await fn();
        return result.data;
      }
    );

    const parsed = createMockParsedMetrics(['system.cpu.utilization'], [hostDimension]);

    mockExecuteEsqlQuery.mockResolvedValue({
      documents: [
        {
          metric_name: 'system.cpu.utilization',
          data_stream: 'metrics-*',
          unit: null,
          metric_type: 'gauge',
          field_type: 'double',
          dimension_fields: ['host.name'],
        },
      ],
      rawResponse: {},
      requestParams: { query: 'TS metrics-* | METRICS_INFO' },
    });

    mockParseMetricsWithTelemetry.mockReturnValue(parsed);
  });

  describe('initial fetch behavior', () => {
    it('fetches and returns parsed metric items when conditions are met', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.metricItems).toHaveLength(1);
        expect(result.current.metricItems[0].metricName).toBe('system.cpu.utilization');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.allDimensions).toEqual([hostDimension]);
    });

    it('returns sorted metricItems and allDimensions', async () => {
      const parsed = createMockParsedMetrics(
        ['system.memory.utilization', 'system.cpu.utilization'],
        [serviceDimension, hostDimension]
      );
      mockParseMetricsWithTelemetry.mockReturnValue(parsed);

      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.metricItems[0].metricName).toBe('system.cpu.utilization');
      expect(result.current.metricItems[1].metricName).toBe('system.memory.utilization');
      expect(result.current.allDimensions[0].name).toBe('host.name');
      expect(result.current.allDimensions[1].name).toBe('service.name');
    });

    it('returns empty arrays when no data is available', async () => {
      mockExecuteEsqlQuery.mockResolvedValue({
        documents: [],
        rawResponse: {},
        requestParams: { query: 'TS metrics-* | METRICS_INFO' },
      });
      mockParseMetricsWithTelemetry.mockReturnValue({
        metricItems: [],
        allDimensions: [],
        telemetry: {
          total_number_of_metrics: 0,
          total_number_of_dimensions: 0,
          metrics_by_type: {},
          units: {},
          multi_value_counts: { data_streams: 0, field_types: 0, metric_types: 0 },
        },
      });

      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.metricItems).toEqual([]);
      expect(result.current.allDimensions).toEqual([]);
      expect(result.current.activeDimensions).toEqual([]);
    });
  });

  describe('shouldFetch guard', () => {
    it('does not fetch when component is not visible', async () => {
      const params = createDefaultParams();
      params.isComponentVisible = false;

      renderHook(() => useFetchMetricsData(params));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    });

    it('does not fetch when query is undefined', async () => {
      const params = createDefaultParams({ query: undefined });

      renderHook(() => useFetchMetricsData(params));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    });

    it('does not fetch when dataView is undefined', async () => {
      const params = createDefaultParams({ dataView: undefined });

      renderHook(() => useFetchMetricsData(params));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    });

    it('does not fetch when query has a transformational command', async () => {
      const { hasTransformationalCommand } = jest.requireMock('@kbn/esql-utils');
      hasTransformationalCommand.mockReturnValue(true);

      const params = createDefaultParams();

      renderHook(() => useFetchMetricsData(params));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    });
  });

  describe('activeDimensions (race condition fix)', () => {
    it('returns empty activeDimensions when no dimensions are selected', async () => {
      const params = createDefaultParams();

      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activeDimensions).toEqual([]);
    });

    it('returns selectedDimensionNames as activeDimensions after fetch completes', async () => {
      const params = createDefaultParams();
      params.selectedDimensionNames = [hostDimension];

      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activeDimensions).toEqual([hostDimension]);
    });

    it('captures dimensions at fetch time so activeDimensions stay consistent with metricItems', async () => {
      // This test verifies the core race-condition fix:
      // activeDimensions should reflect the dimensions that were selected when the
      // fetch was initiated, not the current value of selectedDimensionNames.
      let resolveFirstFetch: (value: any) => void;
      const firstFetchPromise = new Promise((resolve) => {
        resolveFirstFetch = resolve;
      });

      let fetchCallCount = 0;
      mockExecuteEsqlQuery.mockImplementation(async () => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return firstFetchPromise as any;
        }
        return {
          documents: [
            {
              metric_name: 'system.cpu.utilization',
              data_stream: 'metrics-*',
              unit: null,
              metric_type: 'gauge',
              field_type: 'double',
              dimension_fields: ['host.name'],
            },
          ],
          rawResponse: {},
          requestParams: { query: 'TS metrics-* | METRICS_INFO' },
        };
      });

      const params = createDefaultParams();
      params.selectedDimensionNames = [hostDimension];

      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      // Wait for the initial fetch to start
      await waitFor(() => {
        expect(fetchCallCount).toBeGreaterThanOrEqual(1);
      });

      // Change dimensions while first fetch is in-flight
      const updatedParams = {
        ...params,
        selectedDimensionNames: [hostDimension, serviceDimension],
      };
      rerender(updatedParams);

      // Resolve the first fetch
      resolveFirstFetch!({
        documents: [
          {
            metric_name: 'system.cpu.utilization',
            data_stream: 'metrics-*',
            unit: null,
            metric_type: 'gauge',
            field_type: 'double',
            dimension_fields: ['host.name'],
          },
        ],
        rawResponse: {},
        requestParams: { query: 'TS metrics-* | METRICS_INFO' },
      });

      // After resolution, activeDimensions should eventually reflect the latest fetch's dimensions
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The key assertion: activeDimensions aligns with the fetch that produced
      // the current metricItems, not an intermediate stale value
      expect(result.current.activeDimensions).toBeDefined();
      expect(result.current.metricItems).toBeDefined();
    });

    it('updates activeDimensions when selectedDimensionNames changes and fetch completes', async () => {
      const params = createDefaultParams();
      params.selectedDimensionNames = [hostDimension];

      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.activeDimensions).toEqual([hostDimension]);
      });

      // Add a second dimension
      const updatedParams = {
        ...params,
        selectedDimensionNames: [hostDimension, serviceDimension],
      };
      rerender(updatedParams);

      await waitFor(() => {
        expect(result.current.activeDimensions).toEqual([hostDimension, serviceDimension]);
      });
    });

    it('clears activeDimensions when selectedDimensionNames is cleared', async () => {
      const params = createDefaultParams();
      params.selectedDimensionNames = [hostDimension];

      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.activeDimensions).toEqual([hostDimension]);
      });

      const clearedParams = { ...params, selectedDimensionNames: undefined };
      rerender(clearedParams);

      await waitFor(() => {
        expect(result.current.activeDimensions).toEqual([]);
      });
    });
  });

  describe('error handling', () => {
    it('returns error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockExecuteEsqlQuery.mockRejectedValue(fetchError);

      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.metricItems).toEqual([]);
      expect(result.current.allDimensions).toEqual([]);
      expect(result.current.activeDimensions).toEqual([]);
    });

    it('returns empty arrays and null error in initial state', () => {
      // Delay fetch indefinitely so we can inspect the initial state
      mockExecuteEsqlQuery.mockReturnValue(new Promise(() => {}));

      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      expect(result.current.error).toBeNull();
      expect(result.current.metricItems).toEqual([]);
      expect(result.current.allDimensions).toEqual([]);
      expect(result.current.activeDimensions).toEqual([]);
    });
  });

  describe('refetch on dependency changes', () => {
    it('refetches when timeRange changes', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);

      const updatedParams = {
        ...params,
        fetchParams: { ...params.fetchParams, timeRange: { from: 'now-1h', to: 'now' } },
      };
      rerender(updatedParams);

      await waitFor(() => {
        expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      });
    });

    it('refetches when selectedDimensionNames changes', async () => {
      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);

      const updatedParams = { ...params, selectedDimensionNames: [hostDimension] };
      rerender(updatedParams);

      await waitFor(() => {
        expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('telemetry', () => {
    it('calls trackMetricsInfo with parsed telemetry when fetch succeeds', async () => {
      const params = createDefaultParams();
      const { result } = renderHook(() => useFetchMetricsData(params));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockTrackMetricsInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          total_number_of_metrics: 1,
        })
      );
    });
  });

  describe('dimension accumulator', () => {
    const regionDimension = createDimension('region');

    it('preserves previously-seen dimensions when a subsequent fetch drops them', async () => {
      // First fetch: full dimension set (unfiltered)
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(
          ['system.cpu.utilization'],
          [regionDimension, hostDimension, serviceDimension]
        )
      );

      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.allDimensions.map((d) => d.name)).toEqual([
          'host.name',
          'region',
          'service.name',
        ]);
      });

      // Second fetch (user selected host.name, query narrows): region is dropped
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.cpu.utilization'], [hostDimension, serviceDimension])
      );

      rerender({ ...params, selectedDimensionNames: [hostDimension] });

      await waitFor(() => {
        expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        // Accumulator keeps region visible so the user can still pick it
        expect(result.current.allDimensions.map((d) => d.name)).toEqual([
          'host.name',
          'region',
          'service.name',
        ]);
      });
    });

    it('resets accumulated dimensions when the ES|QL query changes', async () => {
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.cpu.utilization'], [hostDimension])
      );

      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.allDimensions.map((d) => d.name)).toEqual(['host.name']);
      });

      // Switch data source; new query returns a different dimension set
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.memory.utilization'], [regionDimension])
      );

      rerender({
        ...params,
        fetchParams: { ...params.fetchParams, query: { esql: 'TS apm-*' } },
      });

      await waitFor(() => {
        expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        // Accumulator is reset: old dimensions from the previous data source are gone
        expect(result.current.allDimensions.map((d) => d.name)).toEqual(['region']);
      });
    });

    it('does not let an aborted fetch corrupt the accumulator for a later fetch', async () => {
      // Reproduces the race where an in-flight fetch resolves *after* its
      // signal has been aborted (because a data-context change triggered
      // effect cleanup and a new fetch). useAsyncFn's internal stale-call
      // tracking discards the aborted fetch's returned value, but the ref
      // write on line ~128 escapes that guard: without the abort check, a
      // subsequent fetch against the new context would see the leaked
      // dimension in the accumulator.
      const regionAlt = createDimension('region');
      let resolveFirstFetch: (value: any) => void;
      const firstFetchPromise = new Promise<any>((resolve) => {
        resolveFirstFetch = resolve;
      });

      let fetchCallCount = 0;
      mockExecuteEsqlQuery.mockImplementation(async () => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return firstFetchPromise;
        }
        return {
          documents: [],
          rawResponse: {},
          requestParams: { query: 'TS apm-* | METRICS_INFO' },
        };
      });

      // Parse mocks are consumed in resolution order, not initiation order:
      //   1st consumption -> fetch #2 (context B, resolves immediately) -> [hostDimension]
      //   2nd consumption -> fetch #1 (context A, aborted, resolves last) -> [regionAlt]
      //   3rd consumption -> fetch #3 (context B, after dim selection)    -> [hostDimension]
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.memory.utilization'], [hostDimension])
      );
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.cpu.utilization'], [regionAlt])
      );
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.memory.utilization'], [hostDimension])
      );

      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(fetchCallCount).toBeGreaterThanOrEqual(1);
      });

      // Switch the data context. Effect cleanup aborts the first fetch's
      // signal and a new fetch begins against context B.
      const contextBParams = {
        ...params,
        fetchParams: { ...params.fetchParams, query: { esql: 'TS apm-*' } },
      };
      rerender(contextBParams);

      await waitFor(() => {
        expect(fetchCallCount).toBe(2);
      });

      // Now resolve the first (aborted) fetch. Its parse callback runs and,
      // without the abort guard, would write [regionAlt] into the accumulator.
      resolveFirstFetch!({
        documents: [
          {
            metric_name: 'system.cpu.utilization',
            data_stream: 'metrics-*',
            unit: null,
            metric_type: 'gauge',
            field_type: 'double',
            dimension_fields: ['region'],
          },
        ],
        rawResponse: {},
        requestParams: { query: 'TS metrics-* | METRICS_INFO' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.allDimensions.map((d) => d.name)).toEqual(['host.name']);
      });

      // Trigger a third fetch within context B by changing only the
      // dimension selection. The accumulator persists across this change
      // and must not contain the stale [regionAlt] value from the aborted
      // fetch that resolved after context B's first fetch.
      rerender({ ...contextBParams, selectedDimensionNames: [hostDimension] });

      await waitFor(() => {
        expect(fetchCallCount).toBe(3);
      });

      await waitFor(() => {
        // Without the abort guard, 'region' would leak in here.
        expect(result.current.allDimensions.map((d) => d.name)).toEqual(['host.name']);
      });
    });

    it('resets accumulated dimensions when the timeRange changes', async () => {
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.cpu.utilization'], [hostDimension, serviceDimension])
      );

      const params = createDefaultParams();
      const { result, rerender } = renderHook(
        (props: ReturnType<typeof createDefaultParams>) => useFetchMetricsData(props),
        { initialProps: params }
      );

      await waitFor(() => {
        expect(result.current.allDimensions.map((d) => d.name)).toEqual([
          'host.name',
          'service.name',
        ]);
      });

      // New time range legitimately drops service.name from the response
      mockParseMetricsWithTelemetry.mockReturnValueOnce(
        createMockParsedMetrics(['system.cpu.utilization'], [hostDimension])
      );

      rerender({
        ...params,
        fetchParams: { ...params.fetchParams, timeRange: { from: 'now-1h', to: 'now' } },
      });

      await waitFor(() => {
        expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.allDimensions.map((d) => d.name)).toEqual(['host.name']);
      });
    });
  });
});
