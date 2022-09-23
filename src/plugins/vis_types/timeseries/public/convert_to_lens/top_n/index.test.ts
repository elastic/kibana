/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { convertToLens } from '.';
import { createPanel, createSeries } from '../lib/__mocks__';

const mockGetMetricsColumns = jest.fn();
const mockGetBucketsColumns = jest.fn();
const mockGetConfigurationForTopN = jest.fn();
const mockIsValidMetrics = jest.fn();
const mockGetDatasourceValue = jest
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockGetDataSourceInfo = jest.fn();

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

jest.mock('../lib/configurations/xy', () => ({
  getConfigurationForTopN: jest.fn(() => mockGetConfigurationForTopN()),
  getLayers: jest.fn().mockReturnValue([]),
}));

jest.mock('../lib/metrics', () => ({
  isValidMetrics: jest.fn(() => mockIsValidMetrics()),
  getReducedTimeRange: jest.fn().mockReturnValue('10'),
}));

jest.mock('../lib/datasource', () => ({
  getDataSourceInfo: jest.fn(() => mockGetDataSourceInfo()),
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

  beforeEach(() => {
    mockIsValidMetrics.mockReturnValue(true);
    mockGetDataSourceInfo.mockReturnValue({
      indexPatternId: 'test-index-pattern',
      timeField: 'timeField',
      indexPattern: { id: 'test-index-pattern' },
    });
    mockGetMetricsColumns.mockReturnValue([{}]);
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetConfigurationForTopN.mockReturnValue({});
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

  test('should return state for valid model', async () => {
    const result = await convertToLens(model);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockGetBucketsColumns).toBeCalledTimes(model.series.length);
    expect(mockGetConfigurationForTopN).toBeCalledTimes(1);
  });

  test('should skip hidden series', async () => {
    const result = await convertToLens(
      createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: true,
          }),
        ],
      })
    );
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockIsValidMetrics).toBeCalledTimes(0);
  });
});
