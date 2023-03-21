/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Operations, PercentileParams } from '@kbn/visualizations-plugin/common';
import { createSeries } from '../__mocks__';
import { Metric } from '../../../../common/types';
import {
  convertToPercentileColumn,
  convertToPercentileColumns,
  convertToPercentileParams,
  isPercentileColumnWithMeta,
} from './percentile';
import {
  PercentileColumn,
  PercentileColumnWithCommonMeta,
  PercentileColumnWithExtendedMeta,
} from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

describe('isPercentileColumnWithMeta', () => {
  const percentileColumnWithoutMeta = {
    columnId: 'col',
    sourceField: 'some-field',
    operationType: Operations.PERCENTILE,
    isBucketed: false,
    isSplit: false,
    dataType: 'number',
    params: {
      percentile: 50,
    },
    meta: { metricId: 'someId' },
  } as PercentileColumn;

  const percentileRankColumn: PercentileColumnWithExtendedMeta = {
    ...percentileColumnWithoutMeta,
    meta: { ...percentileColumnWithoutMeta.meta, reference: 'some-ref.0' },
  };

  test.each<[string, Parameters<typeof isPercentileColumnWithMeta>, boolean]>([
    ["false if meta doesn't contain reference", [percentileColumnWithoutMeta], false],
    ['true if meta contains reference', [percentileRankColumn], true],
  ])('should return %s', (_, input, expected) => {
    expect(isPercentileColumnWithMeta(...input)).toBe(expected);
  });
});

describe('convertToPercentileParams', () => {
  test.each<[string, Parameters<typeof convertToPercentileParams>, PercentileParams | null]>([
    ['null if value is undefined', [undefined], null],
    ['null if value is NaN', ['some-nan-value'], null],
    ['percentile params if value is present and valid', ['100'], { percentile: 100 }],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileParams(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileParams(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToPercentileParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToPercentileColumn', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.PERCENTILE,
  };
  test.each<
    [
      string,
      Parameters<typeof convertToPercentileColumn>,
      Partial<PercentileColumnWithCommonMeta> | Partial<PercentileColumnWithExtendedMeta> | null
    ]
  >([
    ['null if value is undefined', [undefined, { series, metric, dataView }], null],
    ['null if value is NaN', ['some-nan-value', { series, metric, dataView }], null],
    ['null if field is not present', ['50', { series, metric, dataView }], null],
    [
      'precentile column',
      ['50', { series, metric: { ...metric, field: dataView.fields[0].name }, dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'percentile',
        params: { percentile: 50 },
        sourceField: 'bytes',
      } as Partial<PercentileColumnWithCommonMeta>,
    ],
    [
      'precentile column with reference in meta',
      [
        '50',
        { series, metric: { ...metric, field: dataView.fields[0].name }, dataView },
        { index: 0 },
      ],
      {
        meta: { metricId: 'some-id', reference: 'some-id.0' },
        operationType: 'percentile',
        params: { percentile: 50 },
        sourceField: 'bytes',
      } as Partial<PercentileColumnWithExtendedMeta>,
    ],
    [
      'precentile column with reference in meta and reducedTimeRange',
      [
        '50',
        { series, metric: { ...metric, field: dataView.fields[0].name }, dataView },
        { index: 0, reducedTimeRange: '10m' },
      ],
      {
        meta: { metricId: 'some-id', reference: 'some-id.0' },
        operationType: 'percentile',
        params: { percentile: 50 },
        sourceField: 'bytes',
        reducedTimeRange: '10m',
      } as Partial<PercentileColumnWithExtendedMeta>,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToPercentileColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToPercentileColumns', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.PERCENTILE,
  };
  test.each<
    [
      string,
      Parameters<typeof convertToPercentileColumns>,
      Array<Partial<PercentileColumnWithExtendedMeta> | null> | null
    ]
  >([
    ['null if values arr is empty', [{ series, metric, dataView }, {}], null],
    [
      'array with null if values arr contains empty value',
      [
        {
          series,
          metric: { ...metric, percentiles: [{ id: 'some-id', mode: 'line', value: undefined }] },
          dataView,
        },
        {},
      ],
      [null],
    ],
    [
      'array with null if values arr contains NaN value',
      [
        {
          series,
          metric: {
            ...metric,
            percentiles: [{ id: 'some-id', mode: 'line', value: 'invalid value' }],
          },
          dataView,
        },
        {},
      ],
      [null],
    ],
    [
      'percentile columns',
      [
        {
          series,
          metric: {
            ...metric,
            field: dataView.fields[0].name,
            percentiles: [{ id: 'some-id', mode: 'line', value: '75' }],
          },
          dataView,
        },
        {},
      ],
      [
        {
          meta: { metricId: 'some-id', reference: 'some-id.0' },
          operationType: 'percentile',
          params: { percentile: 75 },
          sourceField: 'bytes',
        },
      ],
    ],
    [
      'percentile columns with reducedTimeRange',
      [
        {
          series,
          metric: {
            ...metric,
            field: dataView.fields[0].name,
            percentiles: [{ id: 'some-id', mode: 'line', value: '75' }],
          },
          dataView,
        },
        { reducedTimeRange: '50m' },
      ],
      [
        {
          meta: { metricId: 'some-id', reference: 'some-id.0' },
          operationType: 'percentile',
          params: { percentile: 75 },
          sourceField: 'bytes',
          reducedTimeRange: '50m',
        },
      ],
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToPercentileColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToPercentileColumns(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToPercentileColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
