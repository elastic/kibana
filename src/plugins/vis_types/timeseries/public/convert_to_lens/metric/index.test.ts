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

const mockGetMetricsColumns = jest.fn();
const mockGetBucketsColumns = jest.fn();
const mockGetConfigurationForMetric = jest.fn();
const mockIsValidMetrics = jest.fn();
const mockGetDatasourceValue = jest
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockExtractOrGenerateDatasourceInfo = jest.fn();

jest.mock('../../services', () => ({
  getDataViewsStart: jest.fn(() => mockGetDatasourceValue),
}));

jest.mock('../lib/series', () => ({
  getMetricsColumns: jest.fn(() => mockGetMetricsColumns()),
  getBucketsColumns: jest.fn(() => mockGetBucketsColumns()),
}));

jest.mock('../lib/configurations/metric', () => ({
  getConfigurationForMetric: jest.fn(() => mockGetConfigurationForMetric()),
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
  } as Vis<Panel>;

  const bucket = {
    isBucketed: true,
    isSplit: true,
    operationType: 'terms',
    params: {
      exclude: [],
      excludeIsRegex: true,
      include: [],
      includeIsRegex: true,
      orderAgg: {
        columnId: 'some-id-0',
        dataType: 'number',
        isBucketed: true,
        isSplit: false,
        operationType: 'average',
        params: {},
        sourceField: 'bytes',
      },
      orderBy: { columnId: 'some-id-0', type: 'column' },
      orderDirection: 'asc',
      otherBucket: false,
      parentFormat: { id: 'terms' },
      secondaryFields: [],
      size: 3,
    },
    sourceField: 'bytes',
  };

  const bucket2 = {
    isBucketed: true,
    isSplit: true,
    operationType: 'terms',
    params: {
      exclude: [],
      excludeIsRegex: true,
      include: [],
      includeIsRegex: true,
      orderAgg: {
        columnId: 'some-id-1',
        dataType: 'number',
        isBucketed: true,
        isSplit: false,
        operationType: 'average',
        params: {},
        sourceField: 'bytes',
      },
      orderBy: { columnId: 'some-id-1', type: 'column' },
      orderDirection: 'desc',
      otherBucket: false,
      parentFormat: { id: 'terms' },
      secondaryFields: [],
      size: 10,
    },
    sourceField: 'bytes',
  };

  const metric = {
    meta: { metricId: 'some-id-0' },
    operationType: 'last_value',
    params: { showArrayValues: false, sortField: '@timestamp' },
    reducedTimeRange: '10m',
  };

  beforeEach(() => {
    mockIsValidMetrics.mockReturnValue(true);
    mockExtractOrGenerateDatasourceInfo.mockReturnValue({
      indexPatternId: 'test-index-pattern',
      timeField: 'timeField',
      indexPattern: { id: 'test-index-pattern' },
    });
    mockGetMetricsColumns.mockReturnValue([{}]);
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetConfigurationForMetric.mockReturnValue({});
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

  test('should return null for invalid or unsupported buckets', async () => {
    mockGetBucketsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toBeCalledTimes(1);
  });

  test('should return state for valid model', async () => {
    const result = await convertToLens(vis);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsMetric');
    expect(mockGetBucketsColumns).toBeCalledTimes(model.series.length);
    expect(mockGetConfigurationForMetric).toBeCalledTimes(1);
  });

  test('should drop adhoc dataviews if action is required', async () => {
    const result = await convertToLens(vis, undefined, true);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsMetric');
    expect(mockGetBucketsColumns).toBeCalledTimes(model.series.length);
    expect(mockGetConfigurationForMetric).toBeCalledTimes(1);
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
    expect(result?.type).toBe('lnsMetric');
    expect(mockIsValidMetrics).toBeCalledTimes(0);
  });

  test('should return null if multiple indexPatterns are provided', async () => {
    mockExtractOrGenerateDatasourceInfo.mockReturnValueOnce({
      indexPatternId: 'test-index-pattern-1',
      timeField: 'timeField',
      indexPattern: { id: 'test-index-pattern-1' },
    });

    const result = await convertToLens({
      params: createPanel({
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
      }),
    } as Vis<Panel>);
    expect(result).toBeNull();
  });

  test('should return null if visible series is 2 and bucket is 1', async () => {
    mockGetBucketsColumns.mockReturnValueOnce([bucket]);
    mockGetBucketsColumns.mockReturnValueOnce([]);
    mockGetMetricsColumns.mockReturnValueOnce([metric]);

    const result = await convertToLens({
      params: createPanel({
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
      }),
    } as Vis<Panel>);
    expect(result).toBeNull();
  });

  test('should return null if visible series is 2 and two not unique buckets', async () => {
    mockGetBucketsColumns.mockReturnValueOnce([bucket]);
    mockGetBucketsColumns.mockReturnValueOnce([bucket2]);
    mockGetMetricsColumns.mockReturnValueOnce([metric]);

    const result = await convertToLens({
      params: createPanel({
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
      }),
    } as Vis<Panel>);
    expect(result).toBeNull();
  });

  test('should return state if visible series is 2 and two unique buckets', async () => {
    mockGetBucketsColumns.mockReturnValueOnce([bucket]);
    mockGetBucketsColumns.mockReturnValueOnce([bucket]);
    mockGetMetricsColumns.mockReturnValueOnce([metric]);

    const result = await convertToLens({
      params: createPanel({
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
      }),
    } as Vis<Panel>);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsMetric');
    expect(mockGetConfigurationForMetric).toBeCalledTimes(1);
  });
});
