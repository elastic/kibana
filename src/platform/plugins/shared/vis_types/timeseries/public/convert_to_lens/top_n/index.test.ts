/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { Vis } from '@kbn/visualizations-plugin/public';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { convertToLens } from '.';
import { createPanel, createSeries } from '../lib/__mocks__';
import type { Panel } from '../../../common/types';

const mockGetMetricsColumns = vi.fn();
const mockGetBucketsColumns = vi.fn();
const mockGetConfigurationForTopN = vi.fn();
const mockIsValidMetrics = vi.fn();
const mockGetDatasourceValue = vi
  .fn()
  .mockImplementation(() => Promise.resolve(stubLogstashDataView));
const mockExtractOrGenerateDatasourceInfo = vi.fn();

vi.mock('../../services', () => {
      const mocked = {
      getDataViewsStart: vi.fn(() => mockGetDatasourceValue),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/convert', () => {
      const mocked = {
      excludeMetaFromColumn: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/series', () => {
      const mocked = {
      getMetricsColumns: vi.fn(() => mockGetMetricsColumns()),
      getBucketsColumns: vi.fn(() => mockGetBucketsColumns()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/configurations/xy', () => {
      const mocked = {
      getConfigurationForTopN: vi.fn(() => mockGetConfigurationForTopN()),
      getLayers: vi.fn().mockReturnValue([]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/metrics', () => {
      const mocked = {
      isValidMetrics: vi.fn(() => mockIsValidMetrics()),
      getReducedTimeRange: vi.fn().mockReturnValue('10'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../lib/datasource', () => {
      const mocked = {
      extractOrGenerateDatasourceInfo: vi.fn(() => mockExtractOrGenerateDatasourceInfo()),
    };
      return { ...mocked, default: mocked };
    });

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
    mockGetMetricsColumns.mockReturnValue([{}]);
    mockGetBucketsColumns.mockReturnValue([{}]);
    mockGetConfigurationForTopN.mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should return null for invalid metrics', async () => {
    mockIsValidMetrics.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockIsValidMetrics).toHaveBeenCalledTimes(1);
  });

  test('should return null for invalid or unsupported metrics', async () => {
    mockGetMetricsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetMetricsColumns).toHaveBeenCalledTimes(1);
  });

  test('should return null for invalid or unsupported buckets', async () => {
    mockGetBucketsColumns.mockReturnValue(null);
    const result = await convertToLens(vis);
    expect(result).toBeNull();
    expect(mockGetBucketsColumns).toHaveBeenCalledTimes(1);
  });

  test('should return state for valid model', async () => {
    const result = await convertToLens(vis);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockGetBucketsColumns).toHaveBeenCalledTimes(model.series.length);
    expect(mockGetConfigurationForTopN).toHaveBeenCalledTimes(1);
  });

  test('should drop adhoc dataviews if action is required', async () => {
    const result = await convertToLens(vis, undefined, true);
    expect(result).toBeDefined();
    expect(result?.type).toBe('lnsXY');
    expect(mockGetBucketsColumns).toHaveBeenCalledTimes(model.series.length);
    expect(mockGetConfigurationForTopN).toHaveBeenCalledTimes(1);
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
    expect(mockIsValidMetrics).toHaveBeenCalledTimes(0);
  });

  test('should set the ignoreGlobalFilters if set on the panel', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
          }),
        ],
        ignore_global_filter: 1,
      }),
    } as Vis<Panel>);
    expect(result?.layers.every((l) => l.ignoreGlobalFilters)).toBe(true);
  });

  test('should set the ignoreGlobalFilters if set on the series', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            ignore_global_filter: 1,
          }),
        ],
      }),
    } as Vis<Panel>);
    expect(result?.layers[0].ignoreGlobalFilters).toBe(true);
  });

  test('should ignore the ignoreGlobalFilters if set on hidden series', async () => {
    const result = await convertToLens({
      params: createPanel({
        series: [
          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
            hidden: true,
            ignore_global_filter: 1,
          }),

          createSeries({
            metrics: [{ id: 'some-id', type: METRIC_TYPES.AVG, field: 'test-field' }],
          }),
        ],
      }),
    } as Vis<Panel>);
    expect(result?.layers[0].ignoreGlobalFilters).toBe(false);
  });
});
