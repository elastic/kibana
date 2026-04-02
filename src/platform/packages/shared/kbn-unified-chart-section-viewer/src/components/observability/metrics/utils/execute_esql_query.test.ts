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
import { dataViewWithAtTimefieldMock } from '@kbn/unified-histogram/__mocks__/data_view_with_timefield';
import {
  MetricsExecutionContextAction,
  MetricsExecutionContextName,
} from './execution_context_enums';
import { EsqlResponseError } from './esql_response_error';
import { executeEsqlQuery, fetchEsqlResponseOrThrow } from './execute_esql_query';
import { getMetricsExecutionContext } from './execution_context';

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

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      signal,
      dataView: dataViewWithAtTimefieldMock,
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
        ...getMetricsExecutionContext(
          MetricsExecutionContextAction.FETCH,
          MetricsExecutionContextName.METRICS_INFO
        ),
      })
    );
  });

  it('passes metrics info execution context so the request is labeled in APM', async () => {
    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithAtTimefieldMock,
      uiSettings: mockUiSettings,
    });

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        executionContext: getMetricsExecutionContext(
          MetricsExecutionContextAction.FETCH,
          MetricsExecutionContextName.METRICS_INFO
        ).executionContext,
      })
    );
  });

  it('returns the response from getESQLResults', async () => {
    const result = await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithAtTimefieldMock,
      uiSettings: mockUiSettings,
    });

    expect(result).toStrictEqual([
      {
        metric_name: 'metric.name',
        data_stream: 'metrics-stream-1',
        unit: 'ms',
        metric_type: 'counter',
        field_type: 'gauge',
        dimension_fields: 'host',
      },
    ]);
  });

  it('builds filter from time and filters when timeRange and dataView have timeFieldName', async () => {
    const timeFilter = {
      meta: { index: 'test', type: 'range' as const },
      query: { range: {} },
    } as RangeFilter;
    mockGetTime.mockReturnValue(timeFilter);

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithAtTimefieldMock,
      timeRange: { from: 'now-1h', to: 'now' },
      filters: [],
      uiSettings: mockUiSettings,
    });

    expect(mockGetTime).toHaveBeenCalledWith(
      dataViewWithAtTimefieldMock,
      { from: 'now-1h', to: 'now' },
      { fieldName: dataViewWithAtTimefieldMock.timeFieldName }
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

    await executeEsqlQuery({
      esqlQuery: 'TS metrics-* | METRICS_INFO',
      search: mockSearch,
      dataView: dataViewWithAtTimefieldMock,
      filters: [],
      uiSettings: mockUiSettings,
    });

    expect(mockGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: undefined,
      })
    );
  });

  it('throws EsqlResponseError when response contains an Elasticsearch error object', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        error: {
          type: 'remote_transport_exception',
          reason: 'ccs query failed',
        },
      },
      params: { query: '' },
    } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

    await expect(
      executeEsqlQuery({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        search: mockSearch,
        dataView: dataViewWithAtTimefieldMock,
        uiSettings: mockUiSettings,
      })
    ).rejects.toThrow(EsqlResponseError);
  });

  it('sets status on EsqlResponseError when response includes top-level status', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        error: {
          type: 'remote_transport_exception',
          reason: 'ccs query failed',
        },
        status: 400,
      },
      params: { query: '' },
    } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

    await expect(
      executeEsqlQuery({
        esqlQuery: 'TS metrics-* | METRICS_INFO',
        search: mockSearch,
        dataView: dataViewWithAtTimefieldMock,
        uiSettings: mockUiSettings,
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('fetchEsqlResponseOrThrow', () => {
  it('throws EsqlResponseError for error responses', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        error: {
          type: 'illegal_argument_exception',
          reason: 'bad request',
        },
      },
      params: { query: '' },
    } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

    await expect(
      fetchEsqlResponseOrThrow({} as Parameters<typeof getESQLResults>[0])
    ).rejects.toThrow(EsqlResponseError);
  });

  it('passes through payload status on EsqlResponseError', async () => {
    mockGetESQLResults.mockResolvedValueOnce({
      response: {
        error: { type: 'illegal_argument_exception', reason: 'bad request' },
        status: 400,
      },
      params: { query: '' },
    } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

    await expect(
      fetchEsqlResponseOrThrow({} as Parameters<typeof getESQLResults>[0])
    ).rejects.toMatchObject({ status: 400 });
  });
});
