/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { ExtendedColumnConverterArgs } from '../convert';
import { convertMetricToColumns } from './metrics';

const mockConvertMetricAggregationColumnWithoutSpecialParams = jest.fn();
const mockConvertToOtherParentPipelineAggColumns = jest.fn();
const mockConvertToPercentileColumn = jest.fn();
const mockConvertToPercentileRankColumn = jest.fn();
const mockConvertToSiblingPipelineColumns = jest.fn();
const mockConvertToStdDeviationFormulaColumns = jest.fn();
const mockConvertToLastValueColumn = jest.fn();
const mockConvertToCumulativeSumAggColumn = jest.fn();
const mockConvertToColumnInPercentageMode = jest.fn();

jest.mock('../convert', () => ({
  convertMetricAggregationColumnWithoutSpecialParams: jest.fn(() =>
    mockConvertMetricAggregationColumnWithoutSpecialParams()
  ),
  convertToOtherParentPipelineAggColumns: jest.fn(() =>
    mockConvertToOtherParentPipelineAggColumns()
  ),
  convertToPercentileColumn: jest.fn(() => mockConvertToPercentileColumn()),
  convertToPercentileRankColumn: jest.fn(() => mockConvertToPercentileRankColumn()),
  convertToSiblingPipelineColumns: jest.fn(() => mockConvertToSiblingPipelineColumns()),
  convertToStdDeviationFormulaColumns: jest.fn(() => mockConvertToStdDeviationFormulaColumns()),
  convertToLastValueColumn: jest.fn(() => mockConvertToLastValueColumn()),
  convertToCumulativeSumAggColumn: jest.fn(() => mockConvertToCumulativeSumAggColumn()),
  convertToColumnInPercentageMode: jest.fn(() => mockConvertToColumnInPercentageMode()),
}));

const visType = 'heatmap';

describe('convertMetricToColumns invalid cases', () => {
  const dataView = stubLogstashDataView;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    mockConvertMetricAggregationColumnWithoutSpecialParams.mockReturnValue(null);
    mockConvertToOtherParentPipelineAggColumns.mockReturnValue(null);
    mockConvertToPercentileColumn.mockReturnValue(null);
    mockConvertToPercentileRankColumn.mockReturnValue(null);
    mockConvertToSiblingPipelineColumns.mockReturnValue(null);
    mockConvertToStdDeviationFormulaColumns.mockReturnValue(null);
    mockConvertToLastValueColumn.mockReturnValue(null);
    mockConvertToCumulativeSumAggColumn.mockReturnValue(null);
  });

  const aggs: ExtendedColumnConverterArgs<METRIC_TYPES>['aggs'] = [];

  test.each<[string, Parameters<typeof convertMetricToColumns>, null, jest.Mock | undefined]>([
    [
      'null if agg is not supported',
      [
        {
          agg: { aggType: METRIC_TYPES.GEO_BOUNDS } as unknown as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      undefined,
    ],
    [
      'null if supported agg AVG is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MIN is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MIN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs: [],
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MAX is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MAX } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg SUM is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SUM } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg COUNT is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.COUNT } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg CARDINALITY is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.CARDINALITY } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg VALUE_COUNT is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.VALUE_COUNT } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MEDIAN is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MEDIAN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg STD_DEV is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.STD_DEV } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToStdDeviationFormulaColumns,
    ],
    [
      'null if supported agg PERCENTILES is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.PERCENTILES } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToPercentileColumn,
    ],
    [
      'null if supported agg SINGLE_PERCENTILE is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SINGLE_PERCENTILE } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToPercentileColumn,
    ],
    [
      'null if supported agg PERCENTILE_RANKS is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.PERCENTILE_RANKS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToPercentileRankColumn,
    ],
    [
      'null if supported agg SINGLE_PERCENTILE_RANK is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SINGLE_PERCENTILE_RANK } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToPercentileRankColumn,
    ],
    [
      'null if supported agg TOP_HITS is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.TOP_HITS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToLastValueColumn,
    ],
    [
      'null if supported agg TOP_METRICS is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.TOP_METRICS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToLastValueColumn,
    ],
    [
      'null if supported agg CUMULATIVE_SUM is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.CUMULATIVE_SUM } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToCumulativeSumAggColumn,
    ],
    [
      'null if supported agg DERIVATIVE is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.DERIVATIVE } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'null if supported agg MOVING_FN is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MOVING_FN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'null if supported agg SUM_BUCKET is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SUM_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg MIN_BUCKET is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MIN_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg MAX_BUCKET is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MAX_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg AVG_BUCKET is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs: [],
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg SERIAL_DIFF is not valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SERIAL_DIFF } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      null,
      undefined,
    ],
  ])('should return %s', (_, input, expected, mock) => {
    expect(convertMetricToColumns(...input)).toBeNull();

    if (mock) {
      expect(mock).toBeCalledTimes(1);
    }
  });
});
describe('convertMetricToColumns valid cases', () => {
  const dataView = stubLogstashDataView;
  const aggs: ExtendedColumnConverterArgs<METRIC_TYPES>['aggs'] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const result = [{}];

  beforeAll(() => {
    mockConvertMetricAggregationColumnWithoutSpecialParams.mockReturnValue(result);
    mockConvertToOtherParentPipelineAggColumns.mockReturnValue(result);
    mockConvertToPercentileColumn.mockReturnValue(result);
    mockConvertToPercentileRankColumn.mockReturnValue(result);
    mockConvertToSiblingPipelineColumns.mockReturnValue(result);
    mockConvertToStdDeviationFormulaColumns.mockReturnValue(result);
    mockConvertToLastValueColumn.mockReturnValue(result);
    mockConvertToCumulativeSumAggColumn.mockReturnValue(result);
    mockConvertToColumnInPercentageMode.mockReturnValue(result);
  });

  test.each<[string, Parameters<typeof convertMetricToColumns>, Array<{}>, jest.Mock]>([
    [
      'array of columns if supported agg AVG is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MIN is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MIN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MAX is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MAX } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg SUM is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SUM } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg COUNT is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.COUNT } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg CARDINALITY is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.CARDINALITY } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg VALUE_COUNT is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.VALUE_COUNT } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MEDIAN is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MEDIAN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg STD_DEV is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.STD_DEV } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToStdDeviationFormulaColumns,
    ],
    [
      'array of columns if supported agg PERCENTILES is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.PERCENTILES } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToPercentileColumn,
    ],
    [
      'array of columns if supported agg SINGLE_PERCENTILE is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SINGLE_PERCENTILE } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToPercentileColumn,
    ],
    [
      'array of columns if supported agg PERCENTILE_RANKS is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.PERCENTILE_RANKS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToPercentileRankColumn,
    ],
    [
      'array of columns if supported agg SINGLE_PERCENTILE_RANK is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SINGLE_PERCENTILE_RANK } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToPercentileRankColumn,
    ],
    [
      'array of columns if supported agg TOP_HITS is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.TOP_HITS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToLastValueColumn,
    ],
    [
      'array of columns if supported agg TOP_METRICS is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.TOP_METRICS } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToLastValueColumn,
    ],
    [
      'array of columns if supported agg CUMULATIVE_SUM is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.CUMULATIVE_SUM } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToCumulativeSumAggColumn,
    ],
    [
      'array of columns if supported agg DERIVATIVE is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.DERIVATIVE } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'array of columns if supported agg MOVING_FN is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MOVING_FN } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'array of columns if supported agg SUM_BUCKET is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.SUM_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg MIN_BUCKET is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MIN_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg MAX_BUCKET is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.MAX_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg AVG_BUCKET is valid',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: false },
      ],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'column in percentage mode without range if percentageMode is enabled ',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: true, min: 0, max: 100 },
      ],
      result,
      mockConvertToColumnInPercentageMode,
    ],
    [
      'column in percentage mode with range if percentageMode is enabled ',
      [
        {
          agg: { aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig<METRIC_TYPES>,
          dataView,
          aggs,
          visType,
        },
        { isPercentageMode: true, min: 0, max: 100 },
      ],
      result,
      mockConvertToColumnInPercentageMode,
    ],
  ])('should return %s', (_, input, expected, mock) => {
    expect(convertMetricToColumns(...input)).toEqual(expected.map(expect.objectContaining));
    if (mock) {
      expect(mock).toBeCalledTimes(1);
    }
  });
});
