/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { convertToLens } from '.';
import { createPanel, createSeries } from '../lib/__mocks__';
import { Panel } from '../../../common/types';

const mockConvertToDateHistogramColumn = jest.fn();
const mockGetMetricsColumns = jest.fn();
const mockGetBucketsColumns = jest.fn();
const mockGetConfigurationForTimeseries = jest.fn();
const mockIsValidMetrics = jest.fn();
const mockGetDatasourceValue = jest
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockExtractOrGenerateDatasourceInfo = jest.fn();

jest.mock('../../services', () => ({
  getDataViewsStart: jest.fn(() => mockGetDatasourceValue),
}));

jest.mock('../lib/convert', () => ({
  convertToDateHistogramColumn: jest.fn(() => mockConvertToDateHistogramColumn()),
  excludeMetaFromColumn: jest.fn().mockReturnValue({}),
}));

jest.mock('../lib/series', () => ({
  getMetricsColumns: jest.fn(() => mockGetMetricsColumns()),
  getBucketsColumns: jest.fn(() => mockGetBucketsColumns()),
}));

jest.mock('../lib/configurations/xy', () => ({
  getConfigurationForTimeseries: jest.fn(() => mockGetConfigurationForTimeseries()),
  getLayers: jest.fn().mockReturnValue([]),
}));

jest.mock('../lib/metrics', () => ({
  isValidMetrics: jest.fn(() => mockIsValidMetrics()),
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

  test('should return null for empty time field', async () => {
    mockExtractOrGenerateDatasourceInfo.mockReturnValue({ timeField: null });
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockExtractOrGenerateDatasourceInfo).toBeCalledTimes(1);
  });

  test('should return null for invalid date histogram', async () => {
    mockConvertToDateHistogramColumn.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockConvertToDateHistogramColumn).toBeCalledTimes(1);
  });

  test('should return null for invalid or unsupported metrics', async () => {
    mockGetMetricsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetMetricsColumns).toBeCalledTimes(1);
  });

  test('should return null for invalid or unsupported buckets', async () => {
    mockGetBucketsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return null for static value with buckets', async () => {
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetMetricsColumns.mockReturnValue([
      {
        operationType: 'static_value',
      },
    ]);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetMetricsColumns).toBeCalledTimes(1);
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return state for valid model', async () => {
    const result = await convertToLens(vis);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockGetBucketsColumns).toBeCalledTimes(model.series.length);
    expect(mockGetConfigurationForTimeseries).toBeCalledTimes(1);
  });

  test('should drop adhoc dataviews if action is required', async () => {
    const result = await convertToLens(vis, undefined, true);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockGetBucketsColumns).toBeCalledTimes(model.series.length);
    expect(mockGetConfigurationForTimeseries).toBeCalledTimes(1);
  });

  test('should skip hidden series', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: true,
          }),
        ],
      }),
    } as Vis<Panel>);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockIsValidMetrics).toBeCalledTimes(0);
  });
});
