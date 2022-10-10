/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../common/enums';
import { Metric } from '../../../common/types';
import { convertToLens } from '.';
import { createPanel, createSeries } from '../lib/__mocks__';
import { AvgColumn } from '../lib/convert';

const mockGetMetricsColumns = jest.fn();
const mockGetBucketsColumns = jest.fn();
const mockGetConfigurationForGauge = jest.fn();
const mockIsValidMetrics = jest.fn();
const mockGetDatasourceValue = jest
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockGetDataSourceInfo = jest.fn();
const mockGetSeriesAgg = jest.fn();

jest.mock('../../services', () => ({
  getDataViewsStart: jest.fn(() => mockGetDatasourceValue),
}));

jest.mock('../lib/series', () => ({
  getMetricsColumns: jest.fn(() => mockGetMetricsColumns()),
  getBucketsColumns: jest.fn(() => mockGetBucketsColumns()),
  getSeriesAgg: jest.fn(() => mockGetSeriesAgg()),
}));

jest.mock('../lib/configurations/metric', () => ({
  getConfigurationForGauge: jest.fn(() => mockGetConfigurationForGauge()),
}));

jest.mock('../lib/metrics', () => {
  const actual = jest.requireActual('../lib/metrics');
  return {
    isValidMetrics: jest.fn(() => mockIsValidMetrics()),
    getReducedTimeRange: jest.fn().mockReturnValue('10'),
    SUPPORTED_METRICS: actual.SUPPORTED_METRICS,
    getFormulaFromMetric: actual.getFormulaFromMetric,
  };
});

jest.mock('../lib/datasource', () => ({
  getDataSourceInfo: jest.fn(() => mockGetDataSourceInfo()),
}));

describe('convertToLens', () => {
  const metric = { id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' };
  const model = createPanel({
    series: [createSeries({ metrics: [metric] })],
  });

  const metricColumn: AvgColumn = {
    columnId: 'col-id',
    dataType: 'number',
    isSplit: false,
    isBucketed: false,
    meta: { metricId: metric.id },
    operationType: 'average',
    sourceField: metric.field,
    params: {},
    reducedTimeRange: '10m',
  };

  beforeEach(() => {
    mockIsValidMetrics.mockReturnValue(true);
    mockGetDataSourceInfo.mockReturnValue({
      indexPatternId: 'test-index-pattern',
      timeField: 'timeField',
      indexPattern: { id: 'test-index-pattern' },
    });
    mockGetMetricsColumns.mockReturnValue([{}]);
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetConfigurationForGauge.mockReturnValue({});
    mockGetSeriesAgg.mockReturnValue({ metrics: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null for invalid metrics', async () => {
    mockIsValidMetrics.mockReturnValue(null);
    const result = await convertToLens(model);
    expect(result).toBeNull();
    expect(mockIsValidMetrics).toBeCalledTimes(1);
  });

  test('should return null for invalid or unsupported metrics', async () => {
    mockGetMetricsColumns.mockReturnValue(null);
    const result = await convertToLens(model);
    expect(result).toBeNull();
    expect(mockGetMetricsColumns).toBeCalledTimes(1);
  });

  test('should return null for invalid or unsupported buckets', async () => {
    mockGetBucketsColumns.mockReturnValue(null);
    const result = await convertToLens(model);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return null if metric is staticValue', async () => {
    const result = await convertToLens({
      ...model,
      series: [
        {
          ...model.series[0],
          metrics: [...model.series[0].metrics, { type: TSVB_METRIC_TYPES.STATIC } as Metric],
        },
      ],
    });
    expect(result).toBeNull();
    expect(mockGetDataSourceInfo).toBeCalledTimes(0);
  });

  test('should return null if only series agg is specified', async () => {
    const result = await convertToLens({
      ...model,
      series: [
        {
          ...model.series[0],
          metrics: [
            { type: TSVB_METRIC_TYPES.SERIES_AGG, function: 'min', id: 'some-id' } as Metric,
          ],
        },
      ],
    });
    expect(result).toBeNull();
  });

  test('should return null configuration is not valid', async () => {
    mockGetMetricsColumns.mockReturnValue([metricColumn]);
    mockGetSeriesAgg.mockReturnValue({ metrics: [metric] });
    mockGetConfigurationForGauge.mockReturnValue(null);

    const result = await convertToLens(model);
    expect(result).toBeNull();
  });

  test('should return state', async () => {
    mockGetMetricsColumns.mockReturnValue([metricColumn]);
    mockGetSeriesAgg.mockReturnValue({ metrics: [metric] });
    mockGetConfigurationForGauge.mockReturnValue({});

    const result = await convertToLens(
      createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: false,
          }),
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: false,
          }),
        ],
      })
    );
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsMetric');
  });
});
