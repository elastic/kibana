/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataViewField, IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { getFormulaForPipelineAgg, getFormulaForAgg } from './formula';

const mockGetMetricFromParentPipelineAgg = jest.fn();
const mockIsPercentileAgg = jest.fn();
const mockIsPercentileRankAgg = jest.fn();
const mockIsPipeline = jest.fn();
const mockIsStdDevAgg = jest.fn();
const mockGetFieldByName = jest.fn();
const originalGetFieldByName = stubLogstashDataView.getFieldByName;

jest.mock('../utils', () => {
  const utils = jest.requireActual('../utils');
  return {
    ...utils,
    getFieldNameFromField: jest.fn((field) => field),
    getMetricFromParentPipelineAgg: jest.fn(() => mockGetMetricFromParentPipelineAgg()),
    isPercentileAgg: jest.fn(() => mockIsPercentileAgg()),
    isPercentileRankAgg: jest.fn(() => mockIsPercentileRankAgg()),
    isPipeline: jest.fn(() => mockIsPipeline()),
    isStdDevAgg: jest.fn(() => mockIsStdDevAgg()),
  };
});

const dataView = stubLogstashDataView;
const visType = 'heatmap';
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
    dataView.getFieldByName = originalGetFieldByName;
  });

  test.each<[string, Parameters<typeof getFormulaForPipelineAgg>, () => void, string | null]>([
    [
      'null if custom metric is invalid',
      [{ agg: aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue(null);
      },
      null,
    ],
    [
      'null if custom metric type is not supported',
      [{ agg: aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
      () => {
        mockGetMetricFromParentPipelineAgg.mockReturnValue({
          aggType: METRIC_TYPES.GEO_BOUNDS,
        });
      },
      null,
    ],
    [
      'correct formula if agg is parent pipeline agg and custom metric is valid and supported pipeline agg',
      [{ agg: aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
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
      [{ agg: aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
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
      [{ agg: aggs[0] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
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
      [{ agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>, aggs, dataView, visType }],
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

  test('null if agg is sibling pipeline agg, custom metric is valid, agg is supported and field type is not supported', () => {
    mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
      aggType: METRIC_TYPES.AVG,
      aggParams: {
        field,
      },
      aggId: '3',
    });

    const field1: DataViewField = {
      name: 'bytes',
      type: 'geo',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
      count: 10,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    } as DataViewField;

    mockGetFieldByName.mockReturnValueOnce(field1);

    dataView.getFieldByName = mockGetFieldByName;
    const agg = getFormulaForPipelineAgg({
      agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
      aggs,
      dataView,
      visType,
    });
    expect(agg).toBeNull();
  });

  test('null if agg is sibling pipeline agg, custom metric is valid, agg is supported, field type is supported and field is not aggregatable', () => {
    mockGetMetricFromParentPipelineAgg.mockReturnValueOnce({
      aggType: METRIC_TYPES.AVG,
      aggParams: {
        field,
      },
      aggId: '3',
    });

    const field1: DataViewField = {
      name: 'str',
      type: 'string',
      esTypes: ['text'],
      aggregatable: false,
      searchable: true,
      count: 10,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    } as DataViewField;

    mockGetFieldByName.mockReturnValueOnce(field1);

    dataView.getFieldByName = mockGetFieldByName;
    const agg = getFormulaForPipelineAgg({
      agg: aggs[1] as SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM>,
      aggs,
      dataView,
      visType,
    });
    expect(agg).toBeNull();
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
    dataView.getFieldByName = originalGetFieldByName;
  });

  test.each<[string, Parameters<typeof getFormulaForAgg>, () => void, string | null]>([
    [
      'null if agg type is not supported',
      [
        {
          agg: { ...aggs[0], aggType: METRIC_TYPES.GEO_BOUNDS, aggParams: { field } },
          aggs,
          dataView,
          visType,
        },
      ],
      () => {},
      null,
    ],
    [
      'correct pipeline formula if agg is valid pipeline agg',
      [{ agg: aggs[0], aggs, dataView, visType }],
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
      [{ agg: aggs[2], aggs, dataView, visType }],
      () => {
        mockIsPercentileAgg.mockReturnValue(true);
      },
      'percentile(bytes, percentile=10)',
    ],
    [
      'correct percentile rank formula if agg is valid percentile rank agg',
      [{ agg: aggs[3], aggs, dataView, visType }],
      () => {
        mockIsPercentileRankAgg.mockReturnValue(true);
      },
      'percentile_rank(bytes, value=5)',
    ],
    [
      'correct standart deviation formula if agg is valid standart deviation agg',
      [{ agg: aggs[4], aggs, dataView, visType }],
      () => {
        mockIsStdDevAgg.mockReturnValue(true);
      },
      'average(bytes) + 2 * standard_deviation(bytes)',
    ],
    [
      'correct metric formula if agg is valid other metric agg',
      [{ agg: aggs[5], aggs, dataView, visType }],
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

  test.each([
    [
      'null if agg is valid pipeline agg',
      aggs[0],
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
    ],
    [
      'null if percentile rank agg is valid percentile agg',
      aggs[2],
      () => {
        mockIsPercentileAgg.mockReturnValue(true);
      },
    ],
    [
      'null if agg is valid percentile rank agg',
      aggs[3],
      () => {
        mockIsPercentileRankAgg.mockReturnValue(true);
      },
    ],
    [
      'null if agg is valid standart deviation agg',
      aggs[4],
      () => {
        mockIsStdDevAgg.mockReturnValue(true);
      },
    ],
    ['null if agg is valid other metric agg', aggs[5], () => {}],
  ])('should return %s and field type is not supported', (_, agg, actions) => {
    actions();
    const field1: DataViewField = {
      name: 'bytes',
      type: 'geo',
      esTypes: ['long'],
      aggregatable: true,
      searchable: true,
      count: 10,
      readFromDocValues: true,
      scripted: false,
      isMapped: true,
    } as DataViewField;

    mockGetFieldByName.mockReturnValueOnce(field1);

    dataView.getFieldByName = mockGetFieldByName;
    const result = getFormulaForPipelineAgg({
      agg: agg as SchemaConfig<
        | METRIC_TYPES.CUMULATIVE_SUM
        | METRIC_TYPES.DERIVATIVE
        | METRIC_TYPES.MOVING_FN
        | METRIC_TYPES.AVG_BUCKET
        | METRIC_TYPES.MAX_BUCKET
        | METRIC_TYPES.MIN_BUCKET
        | METRIC_TYPES.SUM_BUCKET
      >,
      aggs,
      dataView,
      visType,
    });
    expect(result).toBeNull();
  });

  test.each([
    [
      'null if agg is valid pipeline agg',
      aggs[0],
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
    ],
    [
      'null if percentile rank agg is valid percentile agg',
      aggs[2],
      () => {
        mockIsPercentileAgg.mockReturnValue(true);
      },
    ],
    [
      'null if agg is valid percentile rank agg',
      aggs[3],
      () => {
        mockIsPercentileRankAgg.mockReturnValue(true);
      },
    ],
    [
      'null if agg is valid standart deviation agg',
      aggs[4],
      () => {
        mockIsStdDevAgg.mockReturnValue(true);
      },
    ],
    ['null if agg is valid other metric agg', aggs[5], () => {}],
  ])(
    'should return %s, field type is supported and field is not aggregatable',
    (_, agg, actions) => {
      actions();
      const field1: DataViewField = {
        name: 'str',
        type: 'string',
        esTypes: ['text'],
        aggregatable: false,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      } as DataViewField;

      mockGetFieldByName.mockReturnValueOnce(field1);

      dataView.getFieldByName = mockGetFieldByName;
      const result = getFormulaForPipelineAgg({
        agg: agg as SchemaConfig<
          | METRIC_TYPES.CUMULATIVE_SUM
          | METRIC_TYPES.DERIVATIVE
          | METRIC_TYPES.MOVING_FN
          | METRIC_TYPES.AVG_BUCKET
          | METRIC_TYPES.MAX_BUCKET
          | METRIC_TYPES.MIN_BUCKET
          | METRIC_TYPES.SUM_BUCKET
        >,
        aggs,
        dataView,
        visType,
      });
      expect(result).toBeNull();
    }
  );
});
