/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { convertMetricToColumns } from './metrics';

const mockConvertMetricAggregationColumnWithoutSpecialParams = jest.fn();
const mockConvertToOtherParentPipelineAggColumns = jest.fn();
const mockConvertToPercentileColumn = jest.fn();
const mockConvertToPercentileRankColumn = jest.fn();
const mockConvertToSiblingPipelineColumns = jest.fn();
const mockConvertToStdDeviationFormulaColumns = jest.fn();
const mockConvertToLastValueColumn = jest.fn();
const mockConvertToCumulativeSumAggColumn = jest.fn();

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
}));

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

  test.each<[string, Parameters<typeof convertMetricToColumns>, null, jest.Mock | undefined]>([
    [
      'null if agg is not supported',
      [{ aggType: METRIC_TYPES.GEO_BOUNDS } as unknown as SchemaConfig, dataView, []],
      null,
      undefined,
    ],
    [
      'null if supported agg AVG is not valid',
      [{ aggType: METRIC_TYPES.AVG } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MIN is not valid',
      [{ aggType: METRIC_TYPES.MIN } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MAX is not valid',
      [{ aggType: METRIC_TYPES.MAX } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg SUM is not valid',
      [{ aggType: METRIC_TYPES.SUM } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg COUNT is not valid',
      [{ aggType: METRIC_TYPES.COUNT } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg CARDINALITY is not valid',
      [{ aggType: METRIC_TYPES.CARDINALITY } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg VALUE_COUNT is not valid',
      [{ aggType: METRIC_TYPES.VALUE_COUNT } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg MEDIAN is not valid',
      [{ aggType: METRIC_TYPES.MEDIAN } as SchemaConfig, dataView, []],
      null,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'null if supported agg STD_DEV is not valid',
      [{ aggType: METRIC_TYPES.STD_DEV } as SchemaConfig, dataView, []],
      null,
      mockConvertToStdDeviationFormulaColumns,
    ],
    [
      'null if supported agg PERCENTILES is not valid',
      [{ aggType: METRIC_TYPES.PERCENTILES } as SchemaConfig, dataView, []],
      null,
      mockConvertToPercentileColumn,
    ],
    [
      'null if supported agg SINGLE_PERCENTILE is not valid',
      [{ aggType: METRIC_TYPES.SINGLE_PERCENTILE } as SchemaConfig, dataView, []],
      null,
      mockConvertToPercentileColumn,
    ],
    [
      'null if supported agg PERCENTILE_RANKS is not valid',
      [{ aggType: METRIC_TYPES.PERCENTILE_RANKS } as SchemaConfig, dataView, []],
      null,
      mockConvertToPercentileRankColumn,
    ],
    [
      'null if supported agg SINGLE_PERCENTILE_RANK is not valid',
      [{ aggType: METRIC_TYPES.SINGLE_PERCENTILE_RANK } as SchemaConfig, dataView, []],
      null,
      mockConvertToPercentileRankColumn,
    ],
    [
      'null if supported agg TOP_HITS is not valid',
      [{ aggType: METRIC_TYPES.TOP_HITS } as SchemaConfig, dataView, []],
      null,
      mockConvertToLastValueColumn,
    ],
    [
      'null if supported agg TOP_METRICS is not valid',
      [{ aggType: METRIC_TYPES.TOP_METRICS } as SchemaConfig, dataView, []],
      null,
      mockConvertToLastValueColumn,
    ],
    [
      'null if supported agg CUMULATIVE_SUM is not valid',
      [{ aggType: METRIC_TYPES.CUMULATIVE_SUM } as SchemaConfig, dataView, []],
      null,
      mockConvertToCumulativeSumAggColumn,
    ],
    [
      'null if supported agg DERIVATIVE is not valid',
      [{ aggType: METRIC_TYPES.DERIVATIVE } as SchemaConfig, dataView, []],
      null,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'null if supported agg MOVING_FN is not valid',
      [{ aggType: METRIC_TYPES.MOVING_FN } as SchemaConfig, dataView, []],
      null,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'null if supported agg SUM_BUCKET is not valid',
      [{ aggType: METRIC_TYPES.SUM_BUCKET } as SchemaConfig, dataView, []],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg MIN_BUCKET is not valid',
      [{ aggType: METRIC_TYPES.MIN_BUCKET } as SchemaConfig, dataView, []],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg MAX_BUCKET is not valid',
      [{ aggType: METRIC_TYPES.MAX_BUCKET } as SchemaConfig, dataView, []],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg AVG_BUCKET is not valid',
      [{ aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig, dataView, []],
      null,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'null if supported agg SERIAL_DIFF is not valid',
      [{ aggType: METRIC_TYPES.SERIAL_DIFF } as SchemaConfig, dataView, []],
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
  });

  test.each<[string, Parameters<typeof convertMetricToColumns>, Array<{}>, jest.Mock]>([
    [
      'array of columns if supported agg AVG is valid',
      [{ aggType: METRIC_TYPES.AVG } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MIN is valid',
      [{ aggType: METRIC_TYPES.MIN } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MAX is valid',
      [{ aggType: METRIC_TYPES.MAX } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg SUM is valid',
      [{ aggType: METRIC_TYPES.SUM } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg COUNT is valid',
      [{ aggType: METRIC_TYPES.COUNT } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg CARDINALITY is valid',
      [{ aggType: METRIC_TYPES.CARDINALITY } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg VALUE_COUNT is valid',
      [{ aggType: METRIC_TYPES.VALUE_COUNT } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg MEDIAN is valid',
      [{ aggType: METRIC_TYPES.MEDIAN } as SchemaConfig, dataView, []],
      result,
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
    [
      'array of columns if supported agg STD_DEV is valid',
      [{ aggType: METRIC_TYPES.STD_DEV } as SchemaConfig, dataView, []],
      result,
      mockConvertToStdDeviationFormulaColumns,
    ],
    [
      'array of columns if supported agg PERCENTILES is valid',
      [{ aggType: METRIC_TYPES.PERCENTILES } as SchemaConfig, dataView, []],
      result,
      mockConvertToPercentileColumn,
    ],
    [
      'array of columns if supported agg SINGLE_PERCENTILE is valid',
      [{ aggType: METRIC_TYPES.SINGLE_PERCENTILE } as SchemaConfig, dataView, []],
      result,
      mockConvertToPercentileColumn,
    ],
    [
      'array of columns if supported agg PERCENTILE_RANKS is valid',
      [{ aggType: METRIC_TYPES.PERCENTILE_RANKS } as SchemaConfig, dataView, []],
      result,
      mockConvertToPercentileRankColumn,
    ],
    [
      'array of columns if supported agg SINGLE_PERCENTILE_RANK is valid',
      [{ aggType: METRIC_TYPES.SINGLE_PERCENTILE_RANK } as SchemaConfig, dataView, []],
      result,
      mockConvertToPercentileRankColumn,
    ],
    [
      'array of columns if supported agg TOP_HITS is valid',
      [{ aggType: METRIC_TYPES.TOP_HITS } as SchemaConfig, dataView, []],
      result,
      mockConvertToLastValueColumn,
    ],
    [
      'array of columns if supported agg TOP_METRICS is valid',
      [{ aggType: METRIC_TYPES.TOP_METRICS } as SchemaConfig, dataView, []],
      result,
      mockConvertToLastValueColumn,
    ],
    [
      'array of columns if supported agg CUMULATIVE_SUM is valid',
      [{ aggType: METRIC_TYPES.CUMULATIVE_SUM } as SchemaConfig, dataView, []],
      result,
      mockConvertToCumulativeSumAggColumn,
    ],
    [
      'array of columns if supported agg DERIVATIVE is valid',
      [{ aggType: METRIC_TYPES.DERIVATIVE } as SchemaConfig, dataView, []],
      result,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'array of columns if supported agg MOVING_FN is valid',
      [{ aggType: METRIC_TYPES.MOVING_FN } as SchemaConfig, dataView, []],
      result,
      mockConvertToOtherParentPipelineAggColumns,
    ],
    [
      'array of columns if supported agg SUM_BUCKET is valid',
      [{ aggType: METRIC_TYPES.SUM_BUCKET } as SchemaConfig, dataView, []],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg MIN_BUCKET is valid',
      [{ aggType: METRIC_TYPES.MIN_BUCKET } as SchemaConfig, dataView, []],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg MAX_BUCKET is valid',
      [{ aggType: METRIC_TYPES.MAX_BUCKET } as SchemaConfig, dataView, []],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
    [
      'array of columns if supported agg AVG_BUCKET is valid',
      [{ aggType: METRIC_TYPES.AVG_BUCKET } as SchemaConfig, dataView, []],
      result,
      mockConvertToSiblingPipelineColumns,
    ],
  ])('should return %s', (_, input, expected, mock) => {
    expect(convertMetricToColumns(...input)).toEqual(expected.map(expect.objectContaining));
    if (mock) {
      expect(mock).toBeCalledTimes(1);
    }
  });
});
