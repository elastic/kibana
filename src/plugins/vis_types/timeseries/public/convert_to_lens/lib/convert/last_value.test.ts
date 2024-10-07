/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSeries } from '../__mocks__';
import { convertToLastValueParams, convertToLastValueColumn } from './last_value';
import { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { LastValueColumn } from './types';
import { LastValueParams } from '@kbn/visualizations-plugin/common/convert_to_lens';

describe('convertToLastValueParams', () => {
  const commonMetric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.TOP_HIT,
  };
  const sortField = 'some-field';
  test.each<[string, Parameters<typeof convertToLastValueParams>, LastValueParams]>([
    [
      'params with emtpy sortField if metric.order_by is emtpy',
      [commonMetric],
      { showArrayValues: false, sortField: undefined },
    ],
    [
      'params with sortField if metric.order_by is set',
      [{ ...commonMetric, order_by: sortField }],
      { showArrayValues: false, sortField },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToLastValueParams(...input)).toBeNull();
    }
    if (Array.isArray(expected)) {
      expect(convertToLastValueParams(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToLastValueParams(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});

describe('convertToLastValueColumn', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();
  const metric: Metric = {
    id: 'some-id-0',
    type: TSVB_METRIC_TYPES.TOP_HIT,
    field: dataView.fields[0].name,
    order_by: dataView.fields[2].name,
  };

  test.each<[string, Parameters<typeof convertToLastValueColumn>, Partial<LastValueColumn> | null]>(
    [
      [
        'null if size is greater than 1 (unsupported)',
        [{ series, metrics: [{ ...metric, size: 2 }], dataView }],
        null,
      ],
      [
        'null if order is equal to asc (unsupported)',
        [{ series, metrics: [{ ...metric, order: 'asc' }], dataView }],
        null,
      ],
      [
        'null if field does not exist',
        [{ series, metrics: [{ ...metric, field: 'unknown' }], dataView }],
        null,
      ],
      [
        'last value column',
        [{ series, metrics: [metric], dataView }],
        {
          meta: { metricId: 'some-id-0' },
          operationType: 'last_value',
          params: { showArrayValues: false, sortField: '@timestamp' },
        },
      ],
      [
        'last value column with reducedTimeRange',
        [{ series, metrics: [metric], dataView }, '10m'],
        {
          meta: { metricId: 'some-id-0' },
          operationType: 'last_value',
          params: { showArrayValues: false, sortField: '@timestamp' },
          reducedTimeRange: '10m',
        },
      ],
    ]
  )('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToLastValueColumn(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(convertToLastValueColumn(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(convertToLastValueColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
