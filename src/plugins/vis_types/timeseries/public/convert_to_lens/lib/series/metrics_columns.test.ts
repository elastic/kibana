/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { createSeries } from '../__mocks__';
import { getMetricsColumns } from './metrics_columns';

const mockConvertMathToFormulaColumn = jest.fn();
const mockConvertParentPipelineAggToColumns = jest.fn();
const mockConvertToCumulativeSumColumns = jest.fn();
const mockConvertFilterRatioToFormulaColumn = jest.fn();
const mockConvertToCounterRateColumn = jest.fn();
const mockConvertOtherAggsToFormulaColumn = jest.fn();
const mockConvertToLastValueColumn = jest.fn();
const mockConvertToStaticValueColumn = jest.fn();
const mockConvertStaticValueToFormulaColumn = jest.fn();
const mockConvertToStandartDeviationColumn = jest.fn();
const mockConvertMetricAggregationColumnWithoutSpecialParams = jest.fn();
const mockConvertVarianceToFormulaColumn = jest.fn();

jest.mock('../convert', () => ({
  convertMathToFormulaColumn: jest.fn(() => mockConvertMathToFormulaColumn()),
  convertParentPipelineAggToColumns: jest.fn(() => mockConvertParentPipelineAggToColumns()),
  convertToCumulativeSumColumns: jest.fn(() => mockConvertToCumulativeSumColumns()),
  convertFilterRatioToFormulaColumn: jest.fn(() => mockConvertFilterRatioToFormulaColumn()),
  convertToCounterRateColumn: jest.fn(() => mockConvertToCounterRateColumn()),
  convertOtherAggsToFormulaColumn: jest.fn(() => mockConvertOtherAggsToFormulaColumn()),
  convertToLastValueColumn: jest.fn(() => mockConvertToLastValueColumn()),
  convertToStaticValueColumn: jest.fn(() => mockConvertToStaticValueColumn()),
  convertStaticValueToFormulaColumn: jest.fn(() => mockConvertStaticValueToFormulaColumn()),
  convertToStandartDeviationColumn: jest.fn(() => mockConvertToStandartDeviationColumn()),
  convertMetricAggregationColumnWithoutSpecialParams: jest.fn(() =>
    mockConvertMetricAggregationColumnWithoutSpecialParams()
  ),
  convertVarianceToFormulaColumn: jest.fn(() => mockConvertVarianceToFormulaColumn()),
}));

describe('getMetricsColumns', () => {
  const dataView = stubLogstashDataView;
  test.each<[string, Parameters<typeof getMetricsColumns>, typeof jest.fn | null]>([
    [
      'return null if metric type is not supported',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.SUM_OF_SQUARES, id: '1' }] }),
        dataView,
        1,
      ],
      null,
    ],
    [
      'return null if metric type is series agg and split mode is not "everything"',
      [
        createSeries({
          metrics: [
            { type: TSVB_METRIC_TYPES.STD_DEVIATION, id: '1' },
            { type: TSVB_METRIC_TYPES.SERIES_AGG, id: '1' },
          ],
          split_mode: 'terms',
        }),
        dataView,
        1,
      ],
      null,
    ],
    [
      'call convertMathToFormulaColumn if metric type is math',
      [createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.MATH, id: '1' }] }), dataView, 1],
      mockConvertMathToFormulaColumn,
    ],
    [
      'call convertParentPipelineAggToColumns if metric type is moving average',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.MOVING_AVERAGE, id: '1' }] }),
        dataView,
        1,
      ],
      mockConvertParentPipelineAggToColumns,
    ],
    [
      'call convertParentPipelineAggToColumns if metric type is derivative',
      [createSeries({ metrics: [{ type: METRIC_TYPES.DERIVATIVE, id: '1' }] }), dataView, 1],
      mockConvertParentPipelineAggToColumns,
    ],
    [
      'call convertToCumulativeSumColumns if metric type is cumulative sum',
      [createSeries({ metrics: [{ type: METRIC_TYPES.CUMULATIVE_SUM, id: '1' }] }), dataView, 1],
      mockConvertToCumulativeSumColumns,
    ],
    [
      'call convertFilterRatioToFormulaColumn if metric type is filter ratio',
      [createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.FILTER_RATIO, id: '1' }] }), dataView, 1],
      mockConvertFilterRatioToFormulaColumn,
    ],
    [
      'call convertToCounterRateColumn if metric type is positive rate',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.POSITIVE_RATE, id: '1' }] }),
        dataView,
        1,
      ],
      mockConvertToCounterRateColumn,
    ],
    [
      'call convertOtherAggsToFormulaColumn if metric type is positive only',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.POSITIVE_ONLY, id: '1' }] }),
        dataView,
        1,
      ],
      mockConvertOtherAggsToFormulaColumn,
    ],
    [
      'call convertOtherAggsToFormulaColumn if metric type is average bucket',
      [createSeries({ metrics: [{ type: METRIC_TYPES.AVG_BUCKET, id: '1' }] }), dataView, 1],
      mockConvertOtherAggsToFormulaColumn,
    ],
    [
      'call convertOtherAggsToFormulaColumn if metric type is max bucket',
      [createSeries({ metrics: [{ type: METRIC_TYPES.MAX_BUCKET, id: '1' }] }), dataView, 1],
      mockConvertOtherAggsToFormulaColumn,
    ],
    [
      'call convertOtherAggsToFormulaColumn if metric type is min bucket',
      [createSeries({ metrics: [{ type: METRIC_TYPES.MIN_BUCKET, id: '1' }] }), dataView, 1],
      mockConvertOtherAggsToFormulaColumn,
    ],
    [
      'call convertOtherAggsToFormulaColumn if metric type is sum only',
      [createSeries({ metrics: [{ type: METRIC_TYPES.SUM_BUCKET, id: '1' }] }), dataView, 1],
      mockConvertOtherAggsToFormulaColumn,
    ],
    [
      'call convertToLastValueColumn if metric type is top hit',
      [createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.TOP_HIT, id: '1' }] }), dataView, 1],
      mockConvertToLastValueColumn,
    ],
    [
      'call convertStaticValueToFormulaColumn if metric type is static',
      [createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.STATIC, id: '1' }] }), dataView, 1],
      mockConvertStaticValueToFormulaColumn,
    ],
    [
      'call convertToStaticValueColumn if metric type is static and isStaticValueColumnSupported is true',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.STATIC, id: '1' }] }),
        dataView,
        1,
        { isStaticValueColumnSupported: true },
      ],
      mockConvertToStaticValueColumn,
    ],
    [
      'call convertToStandartDeviationColumn if metric type is standart deviation',
      [
        createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.STD_DEVIATION, id: '1' }] }),
        dataView,
        1,
      ],
      mockConvertToStandartDeviationColumn,
    ],
    [
      'call convertVarianceToFormulaColumn if metric type is variance',
      [createSeries({ metrics: [{ type: TSVB_METRIC_TYPES.VARIANCE, id: '1' }] }), dataView, 1],
      mockConvertVarianceToFormulaColumn,
    ],
    [
      'call convertMetricAggregationColumnWithoutSpecialParams if metric type is another supported type',
      [createSeries({ metrics: [{ type: METRIC_TYPES.AVG, id: '1' }] }), dataView, 1],
      mockConvertMetricAggregationColumnWithoutSpecialParams,
    ],
  ])('should %s', (_, input, expected) => {
    if (expected === null) {
      expect(getMetricsColumns(...input)).toBeNull();
    } else {
      getMetricsColumns(...input);
      expect(expected).toHaveBeenCalledTimes(1);
      (expected as jest.Mock<any, any>).mockClear();
    }
  });
});
