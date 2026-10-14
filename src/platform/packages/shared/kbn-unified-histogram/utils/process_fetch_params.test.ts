/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createMockDataViewsService } from '@kbn/data-source/src/__mocks__/data_views_service.mock';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  DataViewSource,
  EsqlSource,
  getRegisteredEsqlDataView,
  registerEsqlSourceInDataViewsCache,
} from '@kbn/data-source';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { dataViewMock } from '../__mocks__/data_view';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { processFetchParams } from './process_fetch_params';
import type { UnifiedHistogramFetchParamsExternal, UnifiedHistogramServices } from '../types';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { ESQLVariableType } from '@kbn/esql-types';

const dataViewsStub = createMockDataViewsService();

const processParams = async (params: UnifiedHistogramFetchParamsExternal) => {
  const fetchParams = await processFetchParams({
    params,
    services: {
      ...unifiedHistogramServicesMock,
      dataViews: dataViewsStub,
    } as UnifiedHistogramServices,
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

  it('derives columns and columnsMap from the result columns of an ES|QL source', async () => {
    const columns = [
      { id: 'a', name: 'colA', meta: { type: 'string' } },
      { id: 'b', name: 'colB', meta: { type: 'number' } },
    ] as DatatableColumn[];
    EsqlSource.clearCache();
    const result = await processParams({
      ...commonParams,
      dataSource: await EsqlSource.create({
        query: 'from logs',
        timeFieldName: '@timestamp',
        resultColumns: columns,
      }),
      query: { esql: 'from logs' },
    });
    expect(result.columns).toEqual(columns);
    expect(result.columnsMap).toEqual({ a: columns[0], b: columns[1] });
  });

  it('has no columns for a data view source', async () => {
    const result = await processParams(commonParams);
    expect(result.columns).toBeUndefined();
    expect(result.columnsMap).toBeUndefined();
  });

  it('assigns breakdown using initialBreakdownField if not in params', async () => {
    const result = await processFetchParams({
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
    const result = await processFetchParams({
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

  it('returns correct breakdown for an ES|QL source with a matching column', async () => {
    const columns = [{ id: '1', name: 'foo', meta: { type: 'string' } }] as DatatableColumn[];
    EsqlSource.clearCache();
    const esqlSource = await EsqlSource.create({
      query: 'from logs',
      timeFieldName: '@timestamp',
      resultColumns: columns,
    });
    const result = await processParams({
      ...commonParams,
      dataSource: esqlSource,
      query: { esql: 'from logs' },
      breakdownField: 'foo',
    });
    expect(result.breakdown?.field?.name).toBe('foo');
  });

  it('returns undefined breakdown for an ES|QL source with a transformational command', async () => {
    const columns = [{ id: '1', name: 'foo', meta: { type: 'string' } }] as DatatableColumn[];
    EsqlSource.clearCache();
    const esqlSource = await EsqlSource.create({
      query: 'from logs | stats count(*)',
      timeFieldName: '@timestamp',
      resultColumns: columns,
    });
    const result = await processParams({
      ...commonParams,
      dataSource: esqlSource,
      query: { esql: 'from logs | stats count(*)' },
      breakdownField: 'foo',
    });
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

describe('processFetchParams ES|QL data view shim', () => {
  let querySeq = 0;

  const makeColumn = (name: string, isNull = false): DatatableColumn => ({
    id: name,
    name,
    meta: { type: 'string' },
    isNull,
  });

  const createDataViews = () => createMockDataViewsService();

  const servicesFor = (dataViews: DataViewsPublicPluginStart): UnifiedHistogramServices =>
    ({
      ...unifiedHistogramServicesMock,
      dataViews,
    } as UnifiedHistogramServices);

  const fetch = (dataSource: EsqlSource, dataViews: DataViewsPublicPluginStart) =>
    processFetchParams({
      params: {
        dataSource,
        requestAdapter: undefined,
        searchSessionId: undefined,
      },
      services: servicesFor(dataViews),
      initialBreakdownField: undefined,
    });

  beforeEach(() => {
    EsqlSource.clearCache();
    querySeq += 1;
  });

  it('reuses the cached DataView for the same source', async () => {
    const dataViews = createDataViews();
    const source = await EsqlSource.create({
      query: `FROM logs-* | LIMIT ${querySeq}`,
      resultColumns: [makeColumn('message')],
      timeFieldName: '@timestamp',
    });

    await fetch(source, dataViews);
    const first = getRegisteredEsqlDataView(source);
    await fetch(source, dataViews);

    expect(first).toBeDefined();
    expect(getRegisteredEsqlDataView(source)).toBe(first);
    expect(dataViews.create).toHaveBeenCalledTimes(1);
  });

  it('reuses a DataView already registered for the source', async () => {
    const dataViews = createDataViews();
    const source = await EsqlSource.create({
      query: `FROM logs-* | LIMIT ${querySeq}`,
      resultColumns: [makeColumn('message')],
      timeFieldName: '@timestamp',
    });

    const registered = await registerEsqlSourceInDataViewsCache(dataViews, source);
    await fetch(source, dataViews);

    expect(getRegisteredEsqlDataView(source)).toBe(registered);
    expect(dataViews.create).toHaveBeenCalledTimes(1);
  });

  it('does not rebuild the shim when withColumns changes the columns', async () => {
    const dataViews = createDataViews();
    const source = await EsqlSource.create({
      query: `FROM logs-* | LIMIT ${querySeq}`,
      resultColumns: [makeColumn('message', false)],
      timeFieldName: '@timestamp',
    });

    await fetch(source, dataViews);
    const first = getRegisteredEsqlDataView(source);
    const withColumns = source.withColumns([makeColumn('message', true), makeColumn('bytes')]);
    await fetch(withColumns, dataViews);

    expect(first).toBeDefined();
    expect(getRegisteredEsqlDataView(withColumns)).toBe(first);
    expect(dataViews.create).toHaveBeenCalledTimes(1);
  });

  it('uses a different shim when the time field changes', async () => {
    const dataViews = createDataViews();
    const query = `FROM logs-* | LIMIT ${querySeq}`;
    const columns = [makeColumn('message')];
    const firstSource = await EsqlSource.create({
      query,
      resultColumns: columns,
      timeFieldName: '@timestamp',
    });
    const nextSource = await EsqlSource.create({
      query,
      resultColumns: columns,
      timeFieldName: 'event.ingested',
    });

    await fetch(firstSource, dataViews);
    await fetch(nextSource, dataViews);
    const first = getRegisteredEsqlDataView(firstSource);
    const second = getRegisteredEsqlDataView(nextSource);

    expect(nextSource.id).not.toBe(firstSource.id);
    expect(second).not.toBe(first);
    expect(second?.id).not.toBe(first?.id);
    expect(dataViews.create).toHaveBeenCalledTimes(2);
  });
});
