/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeFilter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/public';
import { ESQLVariableType } from '@kbn/esql-types';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from './execution_context_enums';
import { executeEsqlQuery } from './execute_esql_query';
import { getMetricsExecutionContext } from './execution_context';

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: jest.fn(() => ({ query: { bool: {} } })),
}));

jest.mock('@kbn/data-plugin/public', () => ({
  getTime: jest.fn(),
  getEsQueryConfig: jest.fn(() => ({ allowLeadingWildcards: true, queryStringOptions: {} })),
}));

const mockBuildEsQuery = buildEsQuery as jest.MockedFunction<typeof buildEsQuery>;
const mockGetTime = getTime as jest.MockedFunction<typeof getTime>;

describe('executeEsqlQuery', () => {
  const mockSearch = jest.fn();
  const mockUiSettings = {} as Parameters<typeof executeEsqlQuery>[0]['uiSettings'];
  const mockResponse = {
    columns: [
      { name: 'metric_name', type: 'keyword' },
      { name: 'data_stream', type: 'keyword' },
      { name: 'unit', type: 'keyword' },
      { name: 'metric_type', type: 'keyword' },
      { name: 'field_type', type: 'keyword' },
      { name: 'dimension_fields', type: 'keyword' },
    ],
    values: [['metric.name', 'metrics-stream-1', 'ms', 'counter', 'gauge', 'host']],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({ rawResponse: mockResponse });
    mockGetTime.mockReturnValue(undefined);
  });

  it('searches with the given esqlQuery, signal, timeRange, and variables', async () => {
    const signal = new AbortController().signal;
    const timeRange = { from: 'now-15m', to: 'now' };
    const variables = [{ key: 'x', value: 'y', type: ESQLVariableType.VALUES }];

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      signal,
      timeFieldName: '@timestamp',
      timeRange,
      filters: [],
      variables,
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'TS metrics-* | METRICS_INFO',
        kibanaQueryContext: { timeRange, esqlVariables: variables },
      }),
      expect.objectContaining({
        abortSignal: signal,
        ...getMetricsExecutionContext(
          MetricsExecutionContextAction.FETCH,
          MetricsExecutionContextName.METRICS_INFO,
          { profile_id: 'metrics-data-source-profile' }
        ),
      })
    );
    expect(mockSearch.mock.calls[0][0]).not.toHaveProperty('approximation');
  });

  it('passes metrics info execution context so the request is labeled in APM', async () => {
    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        executionContext: getMetricsExecutionContext(
          MetricsExecutionContextAction.FETCH,
          MetricsExecutionContextName.METRICS_INFO,
          { profile_id: 'metrics-data-source-profile' }
        ).executionContext,
      })
    );
  });

  it('labels the request with the supplied executionContextName', async () => {
    await executeEsqlQuery({
      esqlQuery: 'FROM exemplars-*.otel-* | STATS BY metric_name',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
      executionContextName: MetricsExecutionContextName.EXEMPLARS,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        executionContext: expect.objectContaining({ page: 'metrics_fetch_exemplars' }),
      })
    );
  });

  it('forwards profileId onto executionContext.meta so the server-side APM transaction is tagged via the standardized pipeline', async () => {
    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        executionContext: expect.objectContaining({
          page: 'metrics_fetch_metrics_info',
          meta: { profile_id: 'metrics-data-source-profile' },
        }),
      })
    );
  });

  it('returns the search response', async () => {
    const result = await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(result.documents).toStrictEqual([
      {
        metric_name: 'metric.name',
        data_stream: 'metrics-stream-1',
        unit: 'ms',
        metric_type: 'counter',
        field_type: 'gauge',
        dimension_fields: 'host',
      },
    ]);
    expect(result.requestParams).toStrictEqual({
      query: 'TS metrics-* | METRICS_INFO',
    });
    expect(result.rawResponse).toBeDefined();
  });

  it('builds filter from time and filters when timeRange and timeFieldName are provided', async () => {
    const timeFilter = {
      meta: { index: 'test', type: 'range' as const },
      query: { range: {} },
    } as RangeFilter;
    mockGetTime.mockReturnValue(timeFilter);

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      timeRange: { from: 'now-1h', to: 'now' },
      filters: [],
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(mockGetTime).toHaveBeenCalledWith(
      undefined,
      { from: 'now-1h', to: 'now' },
      { fieldName: '@timestamp' }
    );
    expect(mockBuildEsQuery).toHaveBeenCalled();
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { query: { bool: {} } },
      }),
      expect.anything()
    );
  });

  it('passes no filter when no time range and no filters', async () => {
    mockGetTime.mockReturnValue(undefined);

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: { esql: mockSearch },
      timeFieldName: '@timestamp',
      filters: [],
      uiSettings: mockUiSettings,
      profileId: 'metrics-data-source-profile',
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: undefined,
      }),
      expect.anything()
    );
  });

  it('throws EsqlResponseError when response contains an Elasticsearch error object', async () => {
    mockSearch.mockResolvedValueOnce({
      rawResponse: {
        error: {
          type: 'remote_transport_exception',
          reason: 'ccs query failed',
        },
      },
    });

    await expect(
      executeEsqlQuery({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        search: { esql: mockSearch },
        timeFieldName: '@timestamp',
        uiSettings: mockUiSettings,
        profileId: 'metrics-data-source-profile',
      })
    ).rejects.toMatchObject({
      name: 'EsqlResponseError',
      message: 'remote_transport_exception: ccs query failed',
    });
  });

  it('sets status on EsqlResponseError when response includes top-level status', async () => {
    mockSearch.mockResolvedValueOnce({
      rawResponse: {
        error: {
          type: 'remote_transport_exception',
          reason: 'ccs query failed',
        },
        status: 400,
      },
    });

    await expect(
      executeEsqlQuery({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        search: { esql: mockSearch },
        timeFieldName: '@timestamp',
        uiSettings: mockUiSettings,
        profileId: 'metrics-data-source-profile',
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
