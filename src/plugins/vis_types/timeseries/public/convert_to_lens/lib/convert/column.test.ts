/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import {
  createStubDataView,
  stubLogstashDataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { stubLogstashFieldSpecMap } from '@kbn/data-views-plugin/common/field.stub';
import {
  durationInputOptions,
  durationOutputOptions,
  InputFormat,
  inputFormats,
  OutputFormat,
  outputFormats,
} from '../../../application/components/lib/durations';
import { MaxColumn as BaseMaxColumn } from '@kbn/visualizations-plugin/common';
import { Metric } from '../../../../common/types';
import { createSeries } from '../__mocks__';
import { createColumn, excludeMetaFromColumn, getFormat, isColumnWithMeta } from './column';
import { MaxColumn } from './types';
import { DATA_FORMATTERS } from '../../../../common/enums';

describe('getFormat', () => {
  const dataViewWithoutSupportedFormatsFields = createStubDataView({
    spec: {
      id: 'logstash-*',
      title: 'logstash-*',
      timeFieldName: 'time',
      fields: stubLogstashFieldSpecMap,
    },
  });

  beforeEach(() => {
    dataViewWithoutSupportedFormatsFields.getFormatterForField = jest
      .fn()
      .mockImplementation(() => ({
        type: {
          id: 'date',
        },
      }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  test('should return formatter value, if formatter is not set to default', () => {
    const formatter = 'percent';
    expect(getFormat(createSeries({ formatter }))).toEqual({
      format: {
        id: formatter,
      },
    });
  });

  test('should return number formatter, if formatter is set to not supported format', () => {
    const formatter = 'custom';
    expect(getFormat(createSeries({ formatter }))).toEqual({
      format: {
        id: 'number',
      },
    });
  });

  test('should return formatter with suffix, if formatter template includes suffix', () => {
    const formatter = 'number';
    expect(getFormat(createSeries({ formatter, value_template: '{{value}}d' }))).toEqual({
      format: {
        id: 'number',
        params: {
          suffix: 'd',
          decimals: 2,
        },
      },
    });
  });

  test.each(
    durationInputOptions.flatMap(({ value: fromValue }) =>
      durationOutputOptions.flatMap(({ value: toValue }) =>
        ['1', '2', '3', ''].map((decimal) => ({ fromValue, toValue, decimal }))
      )
    )
  )(
    'should return a duration formatter for the format "$fromValue,$toValue,$decimal"',
    ({ fromValue, toValue, decimal }) => {
      expect(getFormat(createSeries({ formatter: `${fromValue},${toValue},${decimal}` }))).toEqual({
        format: {
          id: DATA_FORMATTERS.DURATION,
          params: {
            fromUnit: inputFormats[fromValue as InputFormat],
            toUnit: outputFormats[toValue as OutputFormat],
            decimals: decimal ? parseInt(decimal, 10) : 2,
            suffix: '',
          },
        },
      });
    }
  );

  test('should return a duration formatter with the suffix if detected', () => {
    expect(getFormat(createSeries({ formatter: `Y,M,1`, value_template: '{{value}}/d' }))).toEqual({
      format: {
        id: DATA_FORMATTERS.DURATION,
        params: {
          fromUnit: 'years',
          toUnit: 'asMonths',
          decimals: 1,
          suffix: '/d',
        },
      },
    });
  });
});

describe('createColumn', () => {
  const field = stubLogstashDataView.fields[0];
  const scaleUnit = 's';
  const metric: Metric = {
    id: 'some-id',
    type: METRIC_TYPES.AVG,
    field: field.name,
  };

  const metricWithTimeScale: Metric = {
    id: 'some-other-id',
    type: METRIC_TYPES.TOP_HITS,
    field: field.name,
    unit: `1${scaleUnit}`,
  };

  const customLabel = 'some custom';
  const reducedTimeRange = '10h';
  const filter = { query: 'some-query', language: 'lucene' };

  test.each([
    [
      'with default params',
      { seriesArgs: { metrics: [metric], label: '' }, field, metric, extraFields: undefined },
      {
        isBucketed: false,
        isSplit: false,
        label: '',
        meta: { metricId: metric.id },
        dataType: field?.type,
      },
    ],
    [
      'with specified params',
      {
        seriesArgs: {
          metrics: [metricWithTimeScale],
          label: customLabel,
          filter,
        },
        field,
        metric: metricWithTimeScale,
        extraFields: { reducedTimeRange, isBucketed: true, isSplit: true },
      },
      {
        isBucketed: true,
        isSplit: true,
        reducedTimeRange,
        label: customLabel,
        meta: { metricId: metricWithTimeScale.id },
        filter,
        timeScale: scaleUnit,
        dataType: field?.type,
      },
    ],
    [
      'without field',
      {
        seriesArgs: { metrics: [metric], label: '' },
        field: undefined,
        metric,
        extraFields: undefined,
      },
      {
        isBucketed: false,
        isSplit: false,
        label: '',
        meta: { metricId: metric.id },
        dataType: undefined,
      },
    ],
  ])(
    'should create column by metric %s',
    (_, { seriesArgs, field: specifiedField, metric: specifiedMetric, extraFields }, expected) => {
      const series = createSeries(seriesArgs);
      const column = createColumn(series, specifiedMetric, specifiedField, extraFields);

      expect(column).toEqual(expect.objectContaining(expected));
      expect(typeof column.columnId === 'string' && column.columnId.length > 0).toBeTruthy();
    }
  );
});

const column1: BaseMaxColumn = {
  sourceField: 'some-field',
  columnId: 'some-id',
  operationType: 'max',
  isBucketed: false,
  isSplit: false,
  dataType: 'string',
  params: {},
};

const column2: MaxColumn = {
  ...column1,
  meta: { metricId: 'metric-id' },
};

describe('isColumnWithMeta', () => {
  test.each([
    ['without meta', column1 as MaxColumn, false],
    ['with meta', column2, true],
  ])('should check if column is %s', (_, input, expected) => {
    expect(isColumnWithMeta(input)).toBe(expected);
  });
});

describe('excludeMetaFromColumn', () => {
  test.each([
    ['without meta', column1 as MaxColumn, column1],
    ['with meta', column2, column1],
  ])('should exclude meta if column is %s', (_, input, expected) => {
    expect(excludeMetaFromColumn(input)).toEqual(expected);
  });
});
