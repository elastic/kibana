/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { StaticValueParams } from '@kbn/visualizations-plugin/common';
import { createSeries } from '../__mocks__';
import { Metric } from '../../../../common/types';
import { StaticValueColumn } from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { convertToStaticValueColumn, convertToStaticValueParams } from './static_value';

describe('convertToStaticValueParams', () => {
  test.each<[string, Parameters<typeof convertToStaticValueParams>, StaticValueParams]>([
    [
      'param with undefined value',
      [{ id: 'some-id', type: TSVB_METRIC_TYPES.STATIC }],
      { value: undefined },
    ],
    [
      'param with specified value',
      [{ id: 'some-id', type: TSVB_METRIC_TYPES.STATIC, value: 'some value' }],
      { value: 'some value' },
    ],
  ])('should return %s', (_, input, expected) => {
    expect(convertToStaticValueParams(...input)).toEqual(expect.objectContaining(expected));
  });
});

describe('convertToStaticValueColumn', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.STATIC,
  };

  test.each<
    [string, Parameters<typeof convertToStaticValueColumn>, Partial<StaticValueColumn> | null]
  >([
    [
      'null if visibleSeriesCount is equal to 1',
      [{ series, metrics: [metric], dataView }, { visibleSeriesCount: 1 }],
      null,
    ],
    [
      'null if value is not specified',
      [{ series, metrics: [metric], dataView }, { visibleSeriesCount: 2 }],
      null,
    ],
    [
      'static value column',
      [{ series, metrics: [{ ...metric, value: 'some value' }], dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'static_value',
        params: { value: 'some value' },
      },
    ],
    [
      'static value column with reducedTimeRange',
      [
        { series, metrics: [{ ...metric, value: 'some value' }], dataView },
        { reducedTimeRange: '10h' },
      ],
      {
        meta: { metricId: 'some-id' },
        operationType: 'static_value',
        params: { value: 'some value' },
        reducedTimeRange: '10h',
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToStaticValueColumn(...input)).toBeNull();
    } else {
      expect(convertToStaticValueColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
