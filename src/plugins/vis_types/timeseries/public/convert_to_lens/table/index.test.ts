/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TableVisConfiguration } from '@kbn/visualizations-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { convertToLens } from '.';
import { createPanel, createSeries } from '../lib/__mocks__';
import { Panel } from '../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../common/enums';

const mockConvertToDateHistogramColumn = jest.fn();
const mockGetMetricsColumns = jest.fn();
const mockGetBucketsColumns = jest.fn();
const mockGetConfigurationForTimeseries = jest.fn();
const mockIsValidMetrics = jest.fn();
const mockGetDatasourceValue = jest
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockExtractOrGenerateDatasourceInfo = jest.fn();
const mockGetColumnState = jest.fn();

jest.mock('../../services', () => ({
  getDataViewsStart: jest.fn(() => mockGetDatasourceValue),
}));

jest.mock('../lib/convert', () => ({
  excludeMetaFromColumn: jest.fn().mockReturnValue({}),
}));

jest.mock('../lib/series', () => ({
  getMetricsColumns: jest.fn(() => mockGetMetricsColumns()),
  getBucketsColumns: jest.fn(() => mockGetBucketsColumns()),
}));

jest.mock('../lib/configurations/table', () => ({
  getColumnState: jest.fn(() => mockGetColumnState()),
}));

jest.mock('../lib/metrics', () => ({
  isValidMetrics: jest.fn(() => mockIsValidMetrics()),
  getReducedTimeRange: jest.fn().mockReturnValue('10'),
}));

jest.mock('../lib/datasource', () => ({
  extractOrGenerateDatasourceInfo: jest.fn(() => mockExtractOrGenerateDatasourceInfo()),
}));

describe('convertToLens', () => {
  const model = createPanel({
    series: [
      createSeries({
        metrics: [
          { id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' },
          { id: 'some-id-1', type: METRIC_TYPES.COUNT },
        ],
      }),
    ],
  });

  const vis = {
    params: model,
    uiState: {
      get: () => ({}),
    },
  } as Vis<Panel>;

  beforeEach(() => {
    mockIsValidMetrics.mockReturnValue(true);
    mockExtractOrGenerateDatasourceInfo.mockReturnValue({
      indexPatternId: 'test-index-pattern',
      timeField: 'timeField',
      indexPattern: { id: 'test-index-pattern' },
    });
    mockConvertToDateHistogramColumn.mockReturnValue({});
    mockGetMetricsColumns.mockReturnValue([{}]);
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetConfigurationForTimeseries.mockReturnValue({ layers: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null for invalid metrics', async () => {
    mockIsValidMetrics.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockIsValidMetrics).toBeCalledTimes(1);
  });

  test('should return null for invalid or unsupported metrics', async () => {
    mockGetMetricsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetMetricsColumns).toBeCalledTimes(1);
  });

  test('should return null if several series have different “Field” + “Aggregate function”', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [createSeries({ aggregate_by: 'new' }), createSeries({ aggregate_by: 'test' })],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return null if “Aggregate function” is not supported', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [createSeries({ aggregate_by: 'new', aggregate_function: 'cumulative_sum' })],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return null if model have not visible metrics', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: true,
          }),
        ],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeNull();
  });

  test('should return null if only static value is visible metric', async () => {
    mockGetMetricsColumns.mockReturnValue([
      { columnId: 'metric-column-1', operationType: 'static_value' },
    ]);
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: TSVB_METRIC_TYPES.STATIC }],
            hidden: true,
          }),
        ],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeNull();
  });

  test('should return state for valid model', async () => {
    const result = await convertToLens(vis);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsDatatable');
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
    // every series + group by
    expect(mockGetColumnState).toBeCalledTimes(model.series.length + 1);
  });

  test('should return state for valid model with “Field” + “Aggregate function”', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [createSeries({ aggregate_by: 'new', aggregate_function: 'sum' })],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsDatatable');
    expect(mockGetBucketsColumns).toBeCalledTimes(2);
    // every series + group by + (“Field” + “Aggregate function”)
    expect(mockGetColumnState).toBeCalledTimes(model.series.length + 2);
  });

  test('should return correct sorting config', async () => {
    mockGetMetricsColumns.mockReturnValue([{ columnId: 'metric-column-1' }]);
    const result = await convertToLens({
      params: createPanel({
        series: [createSeries({ id: 'test' })],
      }),
      uiState: {
        get: () => ({ sort: { order: 'decs', column: 'test' } }),
      },
    } as Vis<Panel>);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsDatatable');
    expect((result?.configuration as TableVisConfiguration).sorting).toEqual({
      direction: 'decs',
      columnId: 'metric-column-1',
    });
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
    // every series + group by
    expect(mockGetColumnState).toBeCalledTimes(model.series.length + 1);
  });

  test('should skip hidden series', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: true,
          }),
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
          }),
        ],
      }),
      uiState: {
        get: () => ({}),
      },
    } as Vis<Panel>);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsDatatable');
    expect(mockIsValidMetrics).toBeCalledTimes(1);
  });
});
