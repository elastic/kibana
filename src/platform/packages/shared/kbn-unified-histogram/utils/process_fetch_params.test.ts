/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { dataViewMock } from '../__mocks__/data_view';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { processFetchParams } from './process_fetch_params';
import type { UnifiedHistogramFetchParamsExternal } from '../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { ESQLVariableType } from '@kbn/esql-types';

const processParams = async (params: UnifiedHistogramFetchParamsExternal) => {
  const { fetchParams } = await processFetchParams({
    params,
    services: unifiedHistogramServicesMock,
    initialBreakdownField: undefined,
  });
  return fetchParams;
};

describe('processFetchParams', () => {
  const dataSource = new DataViewSource(dataViewWithTimefieldMock);

  const commonParams: UnifiedHistogramFetchParamsExternal = {
    dataSource,
    requestAdapter: undefined,
    searchSessionId: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns filters and esqlVariables to empty arrays if not provided', async () => {
    const result = await processParams(commonParams);
    expect(result.filters).toEqual([]);
    expect(result.esqlVariables).toEqual([]);
  });

  it('assigns lastReloadRequestTime to current timestamp', async () => {
    const before = Date.now();
    const result = await processParams(commonParams);
    const after = Date.now();
    expect(result.lastReloadRequestTime).toBeGreaterThanOrEqual(before);
    expect(result.lastReloadRequestTime).toBeLessThanOrEqual(after);
  });

  it('assigns isTimeBased based on dataSource', async () => {
    expect((await processParams(commonParams)).isTimeBased).toBe(true);
    expect(
      (
        await processParams({
          ...commonParams,
          dataSource: new DataViewSource(dataViewMock),
        })
      ).isTimeBased
    ).toBe(false);
  });

  it('assigns isESQLQuery based on query type', async () => {
    expect(
      (
        await processParams({
          ...commonParams,
          query: { query: 'foo', language: 'kuery' },
        })
      ).isESQLQuery
    ).toBe(false);
    expect(
      (
        await processParams({
          ...commonParams,
          query: { esql: 'from logs' },
        })
      ).isESQLQuery
    ).toBe(true);
  });

  it('assigns columnsMap from columns', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      columns: [
        { id: 'a', name: 'colA' },
        { id: 'b', name: 'colB' },
      ] as any,
    };
    const result = await processParams(params);
    expect(result.columnsMap).toEqual({
      a: { id: 'a', name: 'colA' },
      b: { id: 'b', name: 'colB' },
    });
  });

  it('assigns breakdown using initialBreakdownField if not in params', async () => {
    const { fetchParams: result } = await processFetchParams({
      params: commonParams,
      services: unifiedHistogramServicesMock,
      initialBreakdownField: 'extension',
    });
    expect(result.breakdown?.field?.name).toEqual('extension');
  });

  it('assigns breakdown using params.breakdownField if present', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      breakdownField: 'bytes',
    };
    const { fetchParams: result } = await processFetchParams({
      params,
      services: unifiedHistogramServicesMock,
      initialBreakdownField: 'extension',
    });
    expect(result.breakdown?.field?.name).toEqual('bytes');
  });

  it('returns undefined breakdown if not time based', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      dataSource: new DataViewSource(dataViewMock),
      breakdownField: 'extension',
    };
    const result = await processParams(params);
    expect(result.breakdown).toBeUndefined();
  });

  it('returns correct breakdown for ESQL query with matching column', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      columns: [{ id: '1', name: 'foo' }] as any,
      query: { esql: 'from logs' },
      breakdownField: 'foo',
    };
    const result = await processParams(params);
    expect(result.breakdown?.field?.name).toBe('foo');
  });

  it('returns undefined breakdown for ESQL query with transformational command', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      columns: [{ id: '1', name: 'foo' }] as any,
      query: { esql: 'from logs | stats count(*)' },
      breakdownField: 'foo',
    };
    const result = await processParams(params);
    expect(result.breakdown).toBeUndefined();
  });

  it('omits breakdownField from returned params', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      breakdownField: 'extension',
    };
    const result = await processParams(params);
    expect((result as any).breakdownField).toBeUndefined();
  });

  it('assigns timeInterval to default if not provided', async () => {
    const result = await processParams(commonParams);
    expect(result.timeInterval).toBe('auto');
  });

  it('assigns timeInterval from params if provided', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      timeInterval: '1h',
    };
    const result = await processParams(params);
    expect(result.timeInterval).toBe('1h');
  });

  it('assigns other params correctly', async () => {
    const params: UnifiedHistogramFetchParamsExternal = {
      ...commonParams,
      relativeTimeRange: { from: 'now-15m', to: 'now' },
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:15:00Z' },
      query: { esql: 'FROM logs* | WHERE ??field >= ?otherVar' },
      filters: [
        {
          meta: { alias: null, negate: false, disabled: false, key: 'host.name', value: 'test' },
        },
      ],
      searchSessionId: 'session-123',
      requestAdapter: new RequestAdapter(),
      abortController: new AbortController(),
      esqlVariables: [
        { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
        { key: 'otherVar', value: 'someOtherValue', type: ESQLVariableType.VALUES },
      ],
      table: {} as any,
    };
    const result = await processParams(params);
    expect(result.timeRange).toEqual(params.timeRange);
    expect(result.relativeTimeRange).toEqual(params.relativeTimeRange);
    expect(result.query).toEqual(params.query);
    expect(result.filters).toEqual(params.filters);
    expect(result.searchSessionId).toEqual(params.searchSessionId);
    expect(result.requestAdapter).toEqual(params.requestAdapter);
    expect(result.lastReloadRequestTime).toBeGreaterThan(0);
    expect(result.abortController).toEqual(params.abortController);
    expect(result.esqlVariables).toEqual(params.esqlVariables);
    expect(result.table).toEqual(params.table);
    expect(result.dataSource).toBe(params.dataSource);
  });
});
