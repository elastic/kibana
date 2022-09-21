/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { getFormulaForPipelineAgg, getFormulaForAgg } from './formula';

const mockGetMetricFromParentPipelineAgg = jest.fn();
const mockIsPercentileAgg = jest.fn();
const mockIsPercentileRankAgg = jest.fn();
const mockIsPipeline = jest.fn();
const mockIsStdDevAgg = jest.fn();

jest.mock('../utils', () => ({
  getFieldNameFromField: jest.fn((field) => field),
  getMetricFromParentPipelineAgg: jest.fn(() => mockGetMetricFromParentPipelineAgg()),
  isPercentileAgg: jest.fn(() => mockIsPercentileAgg()),
  isPercentileRankAgg: jest.fn(() => mockIsPercentileRankAgg()),
  isPipeline: jest.fn(() => mockIsPipeline()),
  isStdDevAgg: jest.fn(() => mockIsStdDevAgg()),
}));

const field = stubLogstashDataView.fields[0].name;
const aggs: Array<SchemaConfig<METRIC_TYPES>> = [
  {
    aggId: '1',
    aggType: METRIC_TYPES.CUMULATIVE_SUM,
    aggParams: { customMetric: {} as IAggConfig },
    accessor: 0,
    params: {},
    label: 'cumulative sum',
    format: {},
  },
  {
    aggId: '2',
    aggType: METRIC_TYPES.AVG_BUCKET,
    aggParams: { customMetric: {} as IAggConfig },
    accessor: 0,
    params: {},
    label: 'overall average',
    format: {},
  },
  {
    aggId: '3.10',
    aggType: METRIC_TYPES.PERCENTILES,
    aggParams: { percents: [0, 10], field },
    accessor: 0,
    params: {},
    label: 'percentile',
    format: {},
  },
  {
    aggId: '4.5',
    aggType: METRIC_TYPES.PERCENTILE_RANKS,
    aggParams: { values: [0, 5], field },
    accessor: 0,
    params: {},
    label: 'percintile rank',
    format: {},
  },
  {
    aggId: '5.std_upper',
    aggType: METRIC_TYPES.STD_DEV,
    aggParams: { field },
    accessor: 0,
    params: {},
    label: 'std dev',
    format: {},
  },
  {
    aggId: '6',
    aggType: METRIC_TYPES.AVG,
    aggParams: { field },
    accessor: 0,
    params: {},
    label: 'average',
    format: {},
  },
];

describe('getFormulaForPipelineAgg', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<[string, Parameters<typeof getFormulaForPipelineAgg>, () => void, string | null]>([
    [
      'null if custom metric is invalid',
      [aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if custom metric type is not supported',
      [aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggType: METRIC_TYPES.GEO_BOUNDS,
        });
      },
      null,
    ],
    [
      'correct formula if agg is parent pipeline agg and custom metric is valid and supported pipeline agg',
      [aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg
          .mockReturnValueOnce({
            aggType: METRIC_TYPES.MOVING_FN,
            aggParams: {},
            aggId: '2',
          })
          .mockReturnValueOnce({
            aggType: METRIC_TYPES.AVG,
            aggParams: {
              field,
            },
            aggId: '3',
          });
      },
      'cumulative_sum(moving_average(average(bytes)))',
    ],
    [
      'correct formula if agg is parent pipeline agg and custom metric is valid and supported not pipeline agg',
      [aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
          aggType: METRIC_TYPES.AVG,
          aggParams: {
            field,
          },
          aggId: '2',
        });
      },
      'cumulative_sum(average(bytes))',
    ],
    [
      'correct formula if agg is parent pipeline agg and custom metric is valid and supported percentile rank agg',
      [aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
          aggType: METRIC_TYPES.PERCENTILE_RANKS,
          aggParams: {
            field,
          },
          aggId: '3.10',
        });
      },
      'cumulative_sum(percentile_rank(bytes, value=10))',
    ],
    [
      'correct formula if agg is sibling pipeline agg and custom metric is valid and supported agg',
      [aggs[1] as SchemaConfig<METRIC_TYPES.AVG_BUCKET>, aggs],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
          aggType: METRIC_TYPES.AVG,
          aggParams: {
            field,
          },
          aggId: '3',
        });
      },
      'average(bytes)',
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(getFormulaForPipelineAgg(...input)).toBeNull();
    } else {
      expect(getFormulaForPipelineAgg(...input)).toEqual(expected);
    }
  });
});

describe('getFormulaForAgg', () => {
  beforeEach(() => {
    mockIsPercentileAgg.mockReturnValue(false);
    mockIsPipeline.mockReturnValue(false);
    mockIsStdDevAgg.mockReturnValue(false);
    mockIsPercentileRankAgg.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each<[string, Parameters<typeof getFormulaForAgg>, () => void, string | null]>([
    [
      'null if agg type is not supported',
      [{ ...aggs[0], aggType: METRIC_TYPES.GEO_BOUNDS, aggParams: { field } }, aggs],
      () => {},
      null,
    ],
    [
      'correct pipeline formula if agg is valid pipeline agg',
      [aggs[0], aggs],
      () => {
        mockIsPipeline.mockReturnValue(true);
        mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
          aggType: METRIC_TYPES.AVG,
          aggParams: {
            field,
          },
          aggId: '2',
        });
      },
      'cumulative_sum(average(bytes))',
    ],
    [
      'correct percentile formula if agg is valid percentile agg',
      [aggs[2], aggs],
      () => {
        mockIsPercentileAgg.mockReturnValue(true);
      },
      'percentile(bytes, percentile=10)',
    ],
    [
      'correct percentile rank formula if agg is valid percentile rank agg',
      [aggs[3], aggs],
      () => {
        mockIsPercentileRankAgg.mockReturnValue(true);
      },
      'percentile_rank(bytes, value=5)',
    ],
    [
      'correct standart deviation formula if agg is valid standart deviation agg',
      [aggs[4], aggs],
      () => {
        mockIsStdDevAgg.mockReturnValue(true);
      },
      'average(bytes) + 2 * standard_deviation(bytes)',
    ],
    [
      'correct metric formula if agg is valid other metric agg',
      [aggs[5], aggs],
      () => {},
      'average(bytes)',
    ],
  ])('should return %s', (_, input, actions, expected) => {
    actions();
    if (expected === null) {
      expect(getFormulaForAgg(...input)).toBeNull();
    } else {
      expect(getFormulaForAgg(...input)).toEqual(expected);
    }
  });
});
