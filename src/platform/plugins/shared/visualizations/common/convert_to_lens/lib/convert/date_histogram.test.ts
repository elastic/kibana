/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { AggParamsDateHistogram } from '@kbn/data-plugin/common';
import { convertToDateHistogramColumn } from './date_histogram';
import { DateHistogramColumn } from './types';
import { DataType } from '../../types';

describe('convertToDateHistogramColumn', () => {
  const aggId = `some-id`;
  const timeShift = '1h';
  const aggParams: AggParamsDateHistogram = {
    interval: '1d',
    drop_partials: true,
    field: stubLogstashDataView.fields[0].name,
  };

  test.each<
    [string, Parameters<typeof convertToDateHistogramColumn>, Partial<DateHistogramColumn> | null]
  >([
    [
      'date histogram column if field is provided',
      [aggId, aggParams, stubLogstashDataView, false, false],
      {
        dataType: stubLogstashDataView.fields[0].type as DataType,
        isBucketed: true,
        isSplit: false,
        timeShift: undefined,
        sourceField: stubLogstashDataView.fields[0].name,
        meta: { aggId },
        params: {
          interval: '1d',
          includeEmptyRows: true,
          dropPartials: true,
        },
      },
    ],
    [
      'null if field is not provided',
      [aggId, { interval: '1d', field: undefined }, stubLogstashDataView, false, false],
      null,
    ],
    [
      'date histogram column with isSplit and timeShift if specified',
      [aggId, { ...aggParams, timeShift }, stubLogstashDataView, true, false],
      {
        dataType: stubLogstashDataView.fields[0].type as DataType,
        isBucketed: true,
        isSplit: true,
        sourceField: stubLogstashDataView.fields[0].name,
        timeShift,
        meta: { aggId },
        params: {
          interval: '1d',
          includeEmptyRows: true,
          dropPartials: true,
        },
      },
    ],
    [
      'date histogram column with dropEmptyRowsInDateHistogram if specified',
      [aggId, aggParams, stubLogstashDataView, true, true],
      {
        dataType: stubLogstashDataView.fields[0].type as DataType,
        isBucketed: true,
        isSplit: true,
        sourceField: stubLogstashDataView.fields[0].name,
        timeShift: undefined,
        meta: { aggId },
        params: {
          interval: '1d',
          includeEmptyRows: false,
          dropPartials: true,
        },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToDateHistogramColumn(...input)).toBeNull();
    } else {
      expect(convertToDateHistogramColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
