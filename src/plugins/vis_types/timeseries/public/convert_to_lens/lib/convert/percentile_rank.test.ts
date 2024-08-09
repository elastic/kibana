/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Operations, PercentileRanksParams } from '@kbn/visualizations-plugin/common';
import { createSeries } from '../__mocks__';
import { Metric } from '../../../../common/types';
import {
  convertToPercentileRankColumn,
  convertToPercentileRankColumns,
  convertToPercentileRankParams,
  isPercentileRanksColumnWithMeta,
} from './percentile_rank';
import {
  PercentileRanksColumn,
  PercentileRanksColumnWithCommonMeta,
  PercentileRanksColumnWithExtendedMeta,
} from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

describe('isPercentileRanksColumnWithMeta', () => {
  const percentileRankColumnWithoutMeta = {
    columnId: 'col',
    sourceField: 'some-field',
    operationType: Operations.PERCENTILE_RANK,
    isBucketed: false,
    isSplit: false,
    dataType: 'number',
    params: {
      value: 50,
    },
    meta: { metricId: 'someId' },
  } as PercentileRanksColumn;

  const percentileRankColumn: PercentileRanksColumnWithExtendedMeta = {
    ...percentileRankColumnWithoutMeta,
    meta: { ...percentileRankColumnWithoutMeta.meta, reference: 'some-ref.0' },
  };

  test.each<[string, Parameters<typeof isPercentileRanksColumnWithMeta>, boolean]>([
    ["false if meta doesn't contain reference", [percentileRankColumnWithoutMeta], false],
    ['true if meta contains reference', [percentileRankColumn], true],
  ])('should return %s', (_, input, expected) => {
    expect(isPercentileRanksColumnWithMeta(...input)).toBe(expected);
  });
});

describe('convertToPercentileRankParams', () => {
  test.each<
    [string, Parameters<typeof convertToPercentileRankParams>, PercentileRanksParams | null]
  >([
    ['null if value is undefined', [undefined], null],
    ['null if value is NaN', ['some-nan-value'], null],
    ['percentile ranks params if value is present and valid', ['100'], { value: 100 }],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileRankParams(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileRankParams(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToPercentileRankParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToPercentileRankColumn', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
  };
  test.each<
    [
      string,
      Parameters<typeof convertToPercentileRankColumn>,
      (
        | Partial<PercentileRanksColumnWithCommonMeta>
        | Partial<PercentileRanksColumnWithExtendedMeta>
        | null
      )
    ]
  >([
    ['null if value is undefined', [undefined, series, metric, dataView], null],
    ['null if value is NaN', ['some-nan-value', series, metric, dataView], null],
    ['null if field is not present', ['50', series, metric, dataView], null],
    [
      'precentile rank column',
      ['50', series, { ...metric, field: dataView.fields[0].name }, dataView],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile_rank',
        params: { value: 50 },
        sourceField: 'bytes',
      } as Partial<PercentileRanksColumnWithCommonMeta>,
    ],
    [
      'precentile rank column with reference in meta',
      ['50', series, { ...metric, field: dataView.fields[0].name }, dataView, { index: 0 }],
      {
        meta: { metricId: 'some-id', reference: 'some-id.0' },
        operationType: 'percentile_rank',
        params: { value: 50 },
        sourceField: 'bytes',
      } as Partial<PercentileRanksColumnWithExtendedMeta>,
    ],
    [
      'precentile rank column with reference in meta and reducedTimeRange',
      [
        '50',
        series,
        { ...metric, field: dataView.fields[0].name },
        dataView,
        { index: 0, reducedTimeRange: '10m' },
      ],
      {
        meta: { metricId: 'some-id', reference: 'some-id.0' },
        operationType: 'percentile_rank',
        params: { value: 50 },
        sourceField: 'bytes',
        reducedTimeRange: '10m',
      } as Partial<PercentileRanksColumnWithExtendedMeta>,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileRankColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileRankColumn(...input)).toEqual(
        expected.map(expect.objectContaining)
      );
    } else {
      expect(convertToPercentileRankColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToPercentileRankColumns', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
  };
  test.each<
    [
      string,
      Parameters<typeof convertToPercentileRankColumns>,
      Array<Partial<PercentileRanksColumnWithExtendedMeta> | null> | null
    ]
  >([
    ['null if values arr is empty', [{ series, metric, dataView }, {}], null],
    [
      'array with null if values arr contains empty value',
      [{ series, metric: { ...metric, values: [undefined as unknown as string] }, dataView }, {}],
      [null],
    ],
    [
      'array with null if values arr contains NaN value',
      [{ series, metric: { ...metric, values: ['unvalid value'] }, dataView }, {}],
      [null],
    ],
    [
      'percentile rank columns',
      [
        { series, metric: { ...metric, field: dataView.fields[0].name, values: ['75'] }, dataView },
        {},
      ],
      [
        {
          meta: { metricId: 'some-id', reference: 'some-id.0' },
          operationType: 'percentile_rank',
          params: { value: 75 },
          sourceField: 'bytes',
        },
      ],
    ],
    [
      'percentile rank columns with reducedTimeRange',
      [
        { series, metric: { ...metric, field: dataView.fields[0].name, values: ['75'] }, dataView },
        { reducedTimeRange: '50m' },
      ],
      [
        {
          meta: { metricId: 'some-id', reference: 'some-id.0' },
          operationType: 'percentile_rank',
          params: { value: 75 },
          sourceField: 'bytes',
          reducedTimeRange: '50m',
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileRankColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileRankColumns(...input)).toEqual(
        expected.map((el) => (el === null ? null : expect.objectContaining(el)))
      );
    } else {
      expect(convertToPercentileRankColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
